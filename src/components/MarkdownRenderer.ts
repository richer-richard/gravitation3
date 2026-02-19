/**
 * MarkdownRenderer — renders Markdown with KaTeX math and code highlighting.
 * Handles $...$ inline math and $$...$$ display math.
 */

import { marked } from "marked";
import katex from "katex";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import rust from "highlight.js/lib/languages/rust";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import latex from "highlight.js/lib/languages/latex";

hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("latex", latex);

// Configure marked with highlight.js
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(text, { language: lang }).value;
    return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
  }
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre class="hljs"><code>${escaped}</code></pre>`;
};

marked.use({ renderer });

function renderMath(text: string): string {
  // Display math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="math-error">${math}</span>`;
    }
  });

  // Inline math $...$  (avoid matching $$ and currency like $10)
  text = text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">${math}</span>`;
    }
  });

  return text;
}

export function renderMarkdown(content: string): string {
  // First pass: render math (before markdown to avoid escaping issues)
  const withMath = renderMath(content);
  // Second pass: render markdown
  const html = marked.parse(withMath) as string;
  return html;
}

export function createMarkdownElement(content: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "markdown-body";
  div.innerHTML = renderMarkdown(content);
  return div;
}
