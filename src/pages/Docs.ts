import type { Router } from "../router";

export function renderDocs(container: HTMLElement, _router: Router): void {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 px-6 py-12">
      <div class="max-w-3xl mx-auto">
        <a href="/" data-link class="text-zinc-500 hover:text-zinc-300 text-sm mb-8 inline-block">&larr; Home</a>
        <h1 class="text-4xl font-bold text-zinc-100 mb-8">Documentation</h1>

        <div class="space-y-8 text-zinc-300">
          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-4">Getting Started</h2>
            <p class="mb-4">Select a simulation from the <a href="/explore" data-link class="text-blue-400 hover:text-blue-300">Explore</a> page to begin.</p>
            <p>Each simulation includes a 3D visualization, parameter controls, and optional AI-powered analysis.</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-4">Keyboard Shortcuts</h2>
            <div class="bg-zinc-800 rounded-lg p-4 font-mono text-sm space-y-2">
              <div class="flex justify-between"><span>Space</span><span class="text-zinc-500">Play / Pause</span></div>
              <div class="flex justify-between"><span>R</span><span class="text-zinc-500">Reset simulation</span></div>
              <div class="flex justify-between"><span>T</span><span class="text-zinc-500">Toggle trails</span></div>
              <div class="flex justify-between"><span>C</span><span class="text-zinc-500">Clear trails</span></div>
              <div class="flex justify-between"><span>S</span><span class="text-zinc-500">Screenshot</span></div>
              <div class="flex justify-between"><span>E</span><span class="text-zinc-500">Export data</span></div>
              <div class="flex justify-between"><span>?</span><span class="text-zinc-500">Show help</span></div>
            </div>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-4">AI Chat</h2>
            <p>Configure API keys in <a href="/settings" data-link class="text-blue-400 hover:text-blue-300">Settings</a> to enable AI-powered analysis of your simulations. Supports multiple providers including OpenAI, Anthropic, Google Gemini, DeepSeek, and Moonshot.</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-4">Development</h2>
            <div class="bg-zinc-800 rounded-lg p-4 font-mono text-sm">
              <p class="text-zinc-500"># Install dependencies</p>
              <p>npm install</p>
              <p class="text-zinc-500 mt-2"># Build WASM physics engine</p>
              <p>npm run build:wasm</p>
              <p class="text-zinc-500 mt-2"># Start dev server</p>
              <p>npm run dev</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}
