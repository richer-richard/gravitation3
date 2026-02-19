import type { Router } from "../router";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", placeholder: "AIza..." },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-..." },
  { id: "moonshot", name: "Moonshot / Kimi", placeholder: "sk-..." },
];

export function renderSettings(container: HTMLElement, _router: Router): void {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 px-6 py-12">
      <div class="max-w-2xl mx-auto">
        <a href="/" data-link class="text-zinc-500 hover:text-zinc-300 text-sm mb-8 inline-block">&larr; Home</a>
        <h1 class="text-4xl font-bold text-zinc-100 mb-8">Settings</h1>

        <section class="mb-12">
          <h2 class="text-xl font-semibold text-zinc-100 mb-4">API Keys</h2>
          <p class="text-zinc-400 text-sm mb-6">Keys are stored in your browser's localStorage and sent per-request. They are never persisted on the server.</p>

          <div class="space-y-4">
            ${PROVIDERS.map(
              (p) => `
              <div class="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-zinc-200">${p.name}</label>
                  <span id="status-${p.id}" class="text-xs text-zinc-500">Not configured</span>
                </div>
                <div class="flex gap-2">
                  <input type="password" id="key-${p.id}"
                         placeholder="${p.placeholder}"
                         class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none" />
                  <button data-save="${p.id}"
                          class="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded transition-colors">
                    Save
                  </button>
                  <button data-test="${p.id}"
                          class="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm rounded transition-colors">
                    Test
                  </button>
                </div>
              </div>
            `
            ).join("")}
          </div>
        </section>
      </div>
    </div>
  `;

  // Load existing keys and set up event handlers
  for (const p of PROVIDERS) {
    const input = document.getElementById(`key-${p.id}`) as HTMLInputElement;
    const status = document.getElementById(`status-${p.id}`)!;
    const saved = localStorage.getItem(`api_key_${p.id}`);

    if (saved) {
      input.value = saved;
      status.textContent = "Configured";
      status.className = "text-xs text-emerald-500";
    }
  }

  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    const saveId = target.getAttribute("data-save");
    if (saveId) {
      const input = document.getElementById(`key-${saveId}`) as HTMLInputElement;
      const status = document.getElementById(`status-${saveId}`)!;
      const value = input.value.trim();
      if (value) {
        localStorage.setItem(`api_key_${saveId}`, value);
        status.textContent = "Configured";
        status.className = "text-xs text-emerald-500";
      } else {
        localStorage.removeItem(`api_key_${saveId}`);
        status.textContent = "Not configured";
        status.className = "text-xs text-zinc-500";
      }
    }

    const testId = target.getAttribute("data-test");
    if (testId) {
      const status = document.getElementById(`status-${testId}`)!;
      const key = localStorage.getItem(`api_key_${testId}`);
      if (!key) {
        status.textContent = "No key saved";
        status.className = "text-xs text-amber-500";
        return;
      }
      status.textContent = "Testing...";
      status.className = "text-xs text-blue-400";

      fetch(`http://localhost:5001/health`)
        .then((r) => {
          if (r.ok) {
            status.textContent = "Server reachable";
            status.className = "text-xs text-emerald-500";
          } else {
            status.textContent = "Server error";
            status.className = "text-xs text-red-500";
          }
        })
        .catch(() => {
          status.textContent = "Server unreachable";
          status.className = "text-xs text-red-500";
        });
    }
  });
}
