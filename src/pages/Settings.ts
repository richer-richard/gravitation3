import type { Router } from "../router";
import { createPageShell } from "../components/PageShell";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-...", color: "#10b981" },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", color: "#8b5cf6" },
  { id: "gemini", name: "Google Gemini", placeholder: "AIza...", color: "#3b82f6" },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-...", color: "#0ea5e9" },
  { id: "moonshot", name: "Moonshot / Kimi", placeholder: "sk-...", color: "#f59e0b" },
];

export function renderSettings(container: HTMLElement, router: Router): void {
  const { contentArea } = createPageShell(container, router);

  contentArea.innerHTML = `
    <div class="max-w-2xl mx-auto px-6">
      <!-- Hero -->
      <div class="text-center mb-12">
        <h1 class="page-title text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Settings
        </h1>
        <p class="text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
          Configure API keys for AI-powered simulation analysis. Keys are stored in your browser only.
        </p>
      </div>

      <!-- API Keys Section -->
      <section class="mb-12">
        <h2 class="section-title text-xl font-semibold text-zinc-100 mb-6">API Keys</h2>
        <p class="text-zinc-500 text-sm mb-6">Keys are stored in localStorage and sent per-request. They are never persisted on any server.</p>

        <div class="space-y-4">
          ${PROVIDERS.map(
            (p) => `
            <div class="glass-card p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" id="dot-${p.id}" style="background:${p.color};opacity:0.3"></div>
                  <label class="text-sm font-medium text-zinc-200">${p.name}</label>
                </div>
                <span id="status-${p.id}" class="text-xs text-zinc-500">Not configured</span>
              </div>
              <div class="flex gap-2">
                <input type="password" id="key-${p.id}"
                       placeholder="${p.placeholder}"
                       class="flex-1 bg-zinc-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none transition-colors" />
                <button data-save="${p.id}"
                        class="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-zinc-300 text-sm rounded-lg transition-all">
                  Save
                </button>
                <button data-test="${p.id}"
                        class="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 text-sm rounded-lg transition-all">
                  Test
                </button>
              </div>
            </div>
          `
          ).join("")}
        </div>
      </section>
    </div>
  `;

  // Load existing keys and set up event handlers
  for (const p of PROVIDERS) {
    const input = document.getElementById(`key-${p.id}`) as HTMLInputElement;
    const status = document.getElementById(`status-${p.id}`)!;
    const dot = document.getElementById(`dot-${p.id}`)!;
    const saved = localStorage.getItem(`api_key_${p.id}`);

    if (saved) {
      input.value = saved;
      status.textContent = "Configured";
      status.className = "text-xs text-emerald-500";
      dot.style.opacity = "1";
    }
  }

  contentArea.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    const saveId = target.getAttribute("data-save");
    if (saveId) {
      const input = document.getElementById(`key-${saveId}`) as HTMLInputElement;
      const status = document.getElementById(`status-${saveId}`)!;
      const dot = document.getElementById(`dot-${saveId}`)!;
      const value = input.value.trim();
      if (value) {
        localStorage.setItem(`api_key_${saveId}`, value);
        status.textContent = "Configured";
        status.className = "text-xs text-emerald-500";
        dot.style.opacity = "1";
      } else {
        localStorage.removeItem(`api_key_${saveId}`);
        status.textContent = "Not configured";
        status.className = "text-xs text-zinc-500";
        dot.style.opacity = "0.3";
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
