import type { Router } from "../router";
import { createPageShell } from "../components/PageShell";
import { setupScrollAnimations } from "../components/ScrollAnimator";

interface DocSection {
  id: string;
  title: string;
  html: string;
}

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    html: `
      <p>Welcome to <strong class="text-zinc-200">Gravitation&sup3;</strong> — your interactive physics laboratory running entirely in the browser.</p>
      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Your First Simulation</h4>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Navigate to the <a href="/explore" data-link class="text-blue-400 hover:text-blue-300">Explore</a> page</li>
        <li>Choose a simulation (the <strong>Three-Body Problem</strong> is recommended for beginners)</li>
        <li>Wait for the 3D visualisation to load</li>
        <li>Click <strong class="text-zinc-200">Play</strong> to start</li>
      </ol>
      <div class="info-callout mt-3">
        <p class="text-sm text-zinc-300"><strong class="text-blue-400">Tip:</strong> Let the Figure-8 preset run for 30+ seconds to see the complete periodic pattern. It's mesmerising!</p>
      </div>
    `,
  },
  {
    id: "interface-guide",
    title: "Interface Guide",
    html: `
      <h4 class="text-sm font-semibold text-zinc-200 mt-1 mb-2">Top Bar</h4>
      <p>Shows the simulation name, current preset, and playback controls. The <strong class="text-zinc-200">FPS counter</strong> (top-right of canvas) indicates rendering smoothness — 60 FPS is ideal.</p>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Canvas Area</h4>
      <p>The main 3D visualisation. Camera controls:</p>
      <ul class="list-disc pl-5 space-y-1">
        <li><strong class="text-zinc-200">Left-click + drag</strong> — rotate view</li>
        <li><strong class="text-zinc-200">Right-click + drag</strong> — pan</li>
        <li><strong class="text-zinc-200">Scroll wheel</strong> — zoom in/out</li>
        <li><strong class="text-zinc-200">Touch</strong> — one finger rotates, pinch zooms, two fingers pan</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Right Panel</h4>
      <p>Three tabs:</p>
      <ul class="list-disc pl-5 space-y-1">
        <li><strong class="text-zinc-200">Parameters</strong> — adjust simulation values in real time</li>
        <li><strong class="text-zinc-200">AI Chat</strong> — converse with AI about the current simulation</li>
        <li><strong class="text-zinc-200">Metrics</strong> — energy, momentum, Lyapunov exponents, and more</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Left Sidebar</h4>
      <p>Shows contextual information about the current simulation — key equations, parameter reference, and preset descriptions. Collapsible via the hamburger button.</p>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Timeline Bar</h4>
      <p>Bottom bar showing simulation time and progress. Use the playback buttons to jump to start/end or toggle play/pause.</p>
    `,
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    html: `
      <p class="mb-3">Speed up your workflow with these shortcuts (only active when not typing in an input field):</p>
      <div class="overflow-hidden rounded-lg border border-white/[0.06]">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/[0.06]">
              <th class="text-left px-4 py-2 text-zinc-400 font-medium">Key</th>
              <th class="text-left px-4 py-2 text-zinc-400 font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="text-zinc-300">
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">Space</span></td><td class="px-4 py-2">Play / Pause simulation</td></tr>
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">R</span></td><td class="px-4 py-2">Reset to initial conditions</td></tr>
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">T</span></td><td class="px-4 py-2">Toggle trajectory trails</td></tr>
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">C</span></td><td class="px-4 py-2">Clear trails</td></tr>
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">S</span></td><td class="px-4 py-2">Take screenshot</td></tr>
            <tr class="border-b border-white/[0.04]"><td class="px-4 py-2"><span class="kbd">E</span></td><td class="px-4 py-2">Export simulation data (JSON)</td></tr>
            <tr><td class="px-4 py-2"><span class="kbd">?</span></td><td class="px-4 py-2">Show help overlay</td></tr>
          </tbody>
        </table>
      </div>
    `,
  },
  {
    id: "simulation-controls",
    title: "Simulation Controls",
    html: `
      <h4 class="text-sm font-semibold text-zinc-200 mt-1 mb-2">Playback</h4>
      <ul class="list-disc pl-5 space-y-1">
        <li><strong class="text-zinc-200">Play / Pause</strong> — start or freeze the simulation</li>
        <li><strong class="text-zinc-200">Step</strong> — advance one frame while paused</li>
        <li><strong class="text-zinc-200">Reset</strong> — return to the preset's initial conditions</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Speed</h4>
      <p>The speed selector (0.1x – 5x) controls simulation time relative to real time. Higher speeds trade accuracy for faster exploration. Default 1x is recommended for precision.</p>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Presets</h4>
      <p>Each simulation comes with curated starting configurations:</p>
      <ul class="list-disc pl-5 space-y-1">
        <li><strong class="text-zinc-200">Three-Body:</strong> Figure-8, Lagrange Triangle, Chaotic, Binary</li>
        <li><strong class="text-zinc-200">Lorenz:</strong> Classic (σ=10, ρ=28, β=8/3), Periodic, Transient</li>
        <li><strong class="text-zinc-200">Rössler:</strong> Classic (a=0.2, b=0.2, c=5.7), Periodic, Funnel</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Parameter Tuning</h4>
      <p>Use the Parameters tab in the right panel to adjust values in real time. Watch how the simulation responds — this is where intuition for nonlinear dynamics builds.</p>
      <div class="info-callout mt-3">
        <p class="text-sm text-zinc-300"><strong class="text-blue-400">Watch the energy:</strong> For Hamiltonian systems (three-body, double pendulum), energy should stay nearly constant. If it drifts, reduce the time step for better accuracy.</p>
      </div>
    `,
  },
  {
    id: "ai-chat",
    title: "AI Chat Guide",
    html: `
      <p>The AI Chat panel lets you converse with large language models about the running simulation.</p>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Setup</h4>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Go to <a href="/settings" data-link class="text-blue-400 hover:text-blue-300">Settings</a> and enter an API key for at least one provider</li>
        <li>Open a simulation and switch to the <strong class="text-zinc-200">AI Chat</strong> tab</li>
        <li>Select your preferred model from the dropdown</li>
        <li>Ask a question about the simulation</li>
      </ol>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Supported Providers</h4>
      <ul class="list-disc pl-5 space-y-1">
        <li><strong class="text-zinc-200">Anthropic</strong> — Claude Sonnet 4.6, Claude Haiku</li>
        <li><strong class="text-zinc-200">OpenAI</strong> — GPT-4o, GPT-4o-mini</li>
        <li><strong class="text-zinc-200">Google</strong> — Gemini 2.0 Flash, Gemini Pro</li>
        <li><strong class="text-zinc-200">DeepSeek</strong> — DeepSeek-V3, DeepSeek-R1</li>
        <li><strong class="text-zinc-200">Moonshot</strong> — Kimi models</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">What to Ask</h4>
      <ul class="list-disc pl-5 space-y-1">
        <li>"Why does this orbit look chaotic?"</li>
        <li>"Explain the figure-eight orbit mathematically"</li>
        <li>"What would happen if I increased sigma to 20?"</li>
        <li>"Is this system conserving energy properly?"</li>
        <li>"What are Lagrangian coherent structures?"</li>
      </ul>
    `,
  },
  {
    id: "export-recording",
    title: "Export & Recording",
    html: `
      <h4 class="text-sm font-semibold text-zinc-200 mt-1 mb-2">Screenshots</h4>
      <p>Press <span class="kbd">S</span> or use the screenshot button to capture the current canvas. The image downloads automatically as PNG.</p>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Data Export</h4>
      <p>Press <span class="kbd">E</span> to export the current simulation state as JSON. This includes:</p>
      <ul class="list-disc pl-5 space-y-1">
        <li>Current positions and velocities of all bodies/particles</li>
        <li>Parameter values</li>
        <li>Simulation time and metadata</li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Data Import</h4>
      <p>Load a previously exported JSON file to restore a simulation state. Great for sharing interesting configurations or continuing long runs.</p>
    `,
  },
  {
    id: "developer-setup",
    title: "Developer Setup",
    html: `
      <h4 class="text-sm font-semibold text-zinc-200 mt-1 mb-2">Prerequisites</h4>
      <ul class="list-disc pl-5 space-y-1">
        <li>Node.js 18+ and npm</li>
        <li>Rust toolchain (for WASM compilation)</li>
        <li><code class="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">wasm-pack</code> — install with <code class="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">cargo install wasm-pack</code></li>
      </ul>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Quick Start</h4>
      <div class="rounded-lg border border-white/[0.06] bg-black/20 p-4 font-mono text-xs space-y-1.5 text-zinc-300">
        <p class="text-zinc-500"># Install dependencies</p>
        <p>npm install</p>
        <p class="text-zinc-500 mt-2"># Build WASM physics engine</p>
        <p>npm run build:wasm</p>
        <p class="text-zinc-500 mt-2"># Start dev server (Vite)</p>
        <p>npm run dev</p>
        <p class="text-zinc-500 mt-2"># Build for production</p>
        <p>npm run build</p>
      </div>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Tauri Desktop App</h4>
      <div class="rounded-lg border border-white/[0.06] bg-black/20 p-4 font-mono text-xs space-y-1.5 text-zinc-300">
        <p class="text-zinc-500"># Development</p>
        <p>npm run tauri:dev</p>
        <p class="text-zinc-500 mt-2"># Build release</p>
        <p>npm run tauri:build</p>
      </div>

      <h4 class="text-sm font-semibold text-zinc-200 mt-4 mb-2">Server (for AI proxy)</h4>
      <div class="rounded-lg border border-white/[0.06] bg-black/20 p-4 font-mono text-xs space-y-1.5 text-zinc-300">
        <p>npm run server:dev</p>
      </div>
      <p class="mt-2">The Axum server proxies AI API calls (to avoid CORS issues) and runs on port 5001 by default.</p>
    `,
  },
];

export function renderDocs(container: HTMLElement, router: Router): void {
  const { contentArea, scrollRoot } = createPageShell(container, router);

  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto px-6">

      <!-- Hero -->
      <div class="text-center mb-12">
        <h1 class="page-title text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Documentation
        </h1>
        <p class="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
          Everything you need to explore, configure, and build with Gravitation&sup3;.
        </p>
      </div>

      <!-- Layout: TOC + Content -->
      <div class="flex gap-10">

        <!-- TOC Sidebar (hidden on mobile) -->
        <aside class="hidden lg:block w-48 shrink-0">
          <nav class="docs-toc">
            ${SECTIONS.map(
              (s) => `
              <a href="#${s.id}" class="docs-toc-item" data-toc="${s.id}">${s.title}</a>
            `
            ).join("")}
          </nav>
        </aside>

        <!-- Content -->
        <div class="flex-1 min-w-0 space-y-8">
          ${SECTIONS.map(
            (s) => `
            <section id="${s.id}" class="anim-target glass-card p-6 sm:p-8 scroll-mt-24">
              <h2 class="text-xl font-bold text-zinc-100 mb-4">${s.title}</h2>
              <div class="text-sm text-zinc-400 leading-relaxed space-y-3">
                ${s.html}
              </div>
            </section>
          `
          ).join("")}
        </div>

      </div>
    </div>
  `;

  // TOC click: smooth scroll (prevent default link navigation)
  const tocLinks = contentArea.querySelectorAll<HTMLAnchorElement>(".docs-toc-item");
  tocLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.getAttribute("data-toc")!;
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Scrollspy: highlight active TOC item
  const sectionEls = contentArea.querySelectorAll<HTMLElement>("section[id]");
  const updateToc = () => {
    const scrollTop = scrollRoot.scrollTop + 200;
    let activeId = SECTIONS[0].id;

    sectionEls.forEach((el) => {
      if (el.offsetTop <= scrollTop) {
        activeId = el.id;
      }
    });

    tocLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-toc") === activeId);
    });
  };

  scrollRoot.addEventListener("scroll", updateToc, { passive: true });
  updateToc();

  // Scroll animations
  setupScrollAnimations(scrollRoot, ".anim-target");
}
