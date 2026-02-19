/**
 * ChatPanel — AI chat interface component.
 * Displays chat messages with markdown rendering, model selector, and input.
 */

import { ChatManager } from "../ai/ChatManager";
import type { AIModel, StreamEvent } from "../ai/types";
import { MODELS, getModelsForProvider } from "../ai/registry";
import { renderMarkdown } from "./MarkdownRenderer";
import type { SimulationType } from "../simulations/types";

export class ChatPanel {
  private container: HTMLElement;
  private chatManager: ChatManager;
  private messageList!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private modelSelect!: HTMLSelectElement;
  private thinkingToggle!: HTMLInputElement;
  private streamingContent = "";
  private streamingThinking = "";
  private streamingEl: HTMLElement | null = null;

  constructor(container: HTMLElement, model: AIModel) {
    this.container = container;
    this.chatManager = new ChatManager(model);
  }

  setSimulation(sim: SimulationType): void {
    this.chatManager.setSimulation(sim);
  }

  render(): void {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex items-center gap-2 p-2 border-b border-zinc-700">
          <select class="chat-model-select bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-600 flex-1">
            ${this.buildModelOptions()}
          </select>
          <label class="flex items-center gap-1 text-xs text-zinc-400">
            <input type="checkbox" class="chat-thinking-toggle rounded" />
            Think
          </label>
        </div>
        <div class="chat-messages flex-1 overflow-y-auto p-3 space-y-3"></div>
        <div class="p-2 border-t border-zinc-700">
          <div class="flex gap-2">
            <textarea class="chat-input flex-1 bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-600 resize-none focus:outline-none focus:border-blue-500" rows="2" placeholder="Ask about the simulation..."></textarea>
            <button class="chat-send bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Send</button>
          </div>
        </div>
      </div>
    `;

    this.messageList = this.container.querySelector(".chat-messages")!;
    this.input = this.container.querySelector(".chat-input")!;
    this.sendBtn = this.container.querySelector(".chat-send")!;
    this.modelSelect = this.container.querySelector(".chat-model-select")!;
    this.thinkingToggle = this.container.querySelector(".chat-thinking-toggle")!;

    this.sendBtn.addEventListener("click", () => this.handleSend());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.modelSelect.addEventListener("change", () => {
      const model = MODELS.find((m) => m.id === this.modelSelect.value);
      if (model) {
        this.chatManager.setModel(model);
        // Update thinking toggle visibility
        this.thinkingToggle.parentElement!.style.display =
          model.capabilities.includes("thinking") ? "flex" : "none";
      }
    });

    // Set initial thinking toggle visibility
    const initModel = MODELS.find((m) => m.id === this.modelSelect.value);
    if (initModel) {
      this.thinkingToggle.parentElement!.style.display =
        initModel.capabilities.includes("thinking") ? "flex" : "none";
    }
  }

  private buildModelOptions(): string {
    const providers = ["anthropic", "openai", "gemini", "deepseek", "moonshot"];
    let html = "";
    for (const provider of providers) {
      const models = getModelsForProvider(provider);
      if (models.length > 0) {
        html += `<optgroup label="${provider.charAt(0).toUpperCase() + provider.slice(1)}">`;
        for (const m of models) {
          html += `<option value="${m.id}">${m.displayName}</option>`;
        }
        html += `</optgroup>`;
      }
    }
    return html;
  }

  private async handleSend(): Promise<void> {
    const content = this.input.value.trim();
    if (!content) return;

    this.input.value = "";
    this.sendBtn.disabled = true;

    // Add user message to UI
    this.appendMessage("user", content);

    // Stream response
    this.streamingContent = "";
    this.streamingThinking = "";
    this.streamingEl = this.createStreamingMessage();

    try {
      const generator = this.chatManager.sendMessageStream(content, {
        thinking: this.thinkingToggle.checked,
      });

      for await (const event of generator) {
        this.handleStreamEvent(event);
      }
    } catch {
      // Error already added to chat manager
    }

    // Finalize streaming message
    if (this.streamingEl) {
      this.finalizeStreamingMessage();
    }

    this.sendBtn.disabled = false;
    this.input.focus();
  }

  private handleStreamEvent(event: StreamEvent): void {
    if (!this.streamingEl) return;

    if (event.type === "thinking" && event.content) {
      this.streamingThinking += event.content;
      this.updateStreamingMessage();
    } else if (event.type === "content" && event.content) {
      this.streamingContent += event.content;
      this.updateStreamingMessage();
    } else if (event.type === "error" && event.message) {
      this.streamingContent += `\n\n**Error:** ${event.message}`;
      this.updateStreamingMessage();
    }
  }

  private appendMessage(role: string, content: string, thinking?: string): void {
    const el = document.createElement("div");
    el.className = `chat-message ${role === "user" ? "ml-8" : "mr-4"}`;

    const bubble = document.createElement("div");
    bubble.className =
      role === "user"
        ? "bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-sm text-zinc-200"
        : "bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 text-sm text-zinc-200";

    if (thinking) {
      const thinkEl = document.createElement("details");
      thinkEl.className = "mb-2";
      thinkEl.innerHTML = `<summary class="text-xs text-zinc-500 cursor-pointer">Thinking...</summary><div class="text-xs text-zinc-500 mt-1 pl-2 border-l border-zinc-600">${renderMarkdown(thinking)}</div>`;
      bubble.appendChild(thinkEl);
    }

    const contentEl = document.createElement("div");
    contentEl.className = "markdown-body";
    contentEl.innerHTML =
      role === "user" ? escapeHtml(content) : renderMarkdown(content);
    bubble.appendChild(contentEl);

    el.appendChild(bubble);
    this.messageList.appendChild(el);
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private createStreamingMessage(): HTMLElement {
    const el = document.createElement("div");
    el.className = "chat-message mr-4";

    const bubble = document.createElement("div");
    bubble.className =
      "bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 text-sm text-zinc-200 streaming";

    const thinkEl = document.createElement("details");
    thinkEl.className = "mb-2 thinking-section hidden";
    thinkEl.open = true;
    thinkEl.innerHTML = `<summary class="text-xs text-zinc-500 cursor-pointer">Thinking...</summary><div class="thinking-content text-xs text-zinc-500 mt-1 pl-2 border-l border-zinc-600"></div>`;
    bubble.appendChild(thinkEl);

    const contentEl = document.createElement("div");
    contentEl.className = "content-section markdown-body";
    bubble.appendChild(contentEl);

    el.appendChild(bubble);
    this.messageList.appendChild(el);
    return el;
  }

  private updateStreamingMessage(): void {
    if (!this.streamingEl) return;

    const thinkSection = this.streamingEl.querySelector(
      ".thinking-section"
    ) as HTMLElement;
    const thinkContent = this.streamingEl.querySelector(
      ".thinking-content"
    ) as HTMLElement;
    const contentSection = this.streamingEl.querySelector(
      ".content-section"
    ) as HTMLElement;

    if (this.streamingThinking && thinkSection && thinkContent) {
      thinkSection.classList.remove("hidden");
      thinkContent.innerHTML = renderMarkdown(this.streamingThinking);
    }

    if (contentSection) {
      contentSection.innerHTML = renderMarkdown(this.streamingContent) || '<span class="animate-pulse text-zinc-500">...</span>';
    }

    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private finalizeStreamingMessage(): void {
    if (!this.streamingEl) return;
    const bubble = this.streamingEl.querySelector(".streaming");
    if (bubble) bubble.classList.remove("streaming");
    this.streamingEl = null;
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
