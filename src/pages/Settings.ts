import type { Router } from "../router";
import { createPageShell } from "../components/PageShell";
import { showToast } from "../components/Toast";
import { PROVIDER_CATALOG } from "../ai/providerCatalog";
import { IS_TAURI, tauriHasApiKey, tauriStoreApiKey } from "../utils/tauri-bridge";

const LLM_HEALTH = "http://localhost:5001/health";
const MODEL_HEALTH = "http://localhost:5002/health";

async function hasStoredKey(provider: string, aliases: string[] = []): Promise<boolean> {
  const candidates = [provider, ...aliases];

  if (IS_TAURI) {
    for (const candidate of candidates) {
      try {
        if (await tauriHasApiKey(candidate)) {
          return true;
        }
      } catch {
        // ignore keychain probe failures per candidate
      }
    }
    return false;
  }

  return candidates.some((candidate) => Boolean(localStorage.getItem(`api_key_${candidate}`)));
}

async function saveKey(provider: string, value: string, aliases: string[] = []): Promise<void> {
  if (IS_TAURI) {
    await tauriStoreApiKey(provider, value);
    for (const alias of aliases) {
      await tauriStoreApiKey(alias, "");
    }
    return;
  }

  if (value) {
    localStorage.setItem(`api_key_${provider}`, value);
  } else {
    localStorage.removeItem(`api_key_${provider}`);
  }
  aliases.forEach((alias) => localStorage.removeItem(`api_key_${alias}`));
}

async function probe(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export function renderSettings(container: HTMLElement, router: Router): void {
  const { contentArea, scrollRoot } = createPageShell(container, router);

  contentArea.innerHTML = `
    <div class="settings-studio">
      <aside class="settings-rail">
        <div class="settings-rail-card">
          <p class="studio-kicker">Control Center</p>
          <h1 class="settings-title">Studio Preferences</h1>
          <p class="settings-copy">Provider routing, Rust runtime status, and storage controls for the rebuilt workstation.</p>
        </div>
        <nav class="settings-nav">
          <button class="settings-nav-item active" data-target="providers">Providers</button>
          <button class="settings-nav-item" data-target="runtime">Runtime</button>
          <button class="settings-nav-item" data-target="security">Security</button>
        </nav>
      </aside>

      <div class="settings-content">
        <section id="providers" class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">Endpoints</p>
              <h2 class="studio-section-title">API Provider Rack</h2>
            </div>
          </div>
          <div class="studio-section-copy">
            Seven providers are wired into the local Rust proxy. Keys are ${IS_TAURI ? "stored in your OS keychain" : "stored locally in this browser profile"}.
          </div>
          <div class="settings-provider-grid">
            ${PROVIDER_CATALOG.map((provider) => `
              <article class="settings-provider-card" data-provider-card="${provider.id}">
                <div class="settings-provider-head">
                  <div class="settings-provider-title">
                    <span class="settings-provider-dot" style="background:${provider.color}"></span>
                    <div>
                      <h3>${provider.name}</h3>
                      <p>${provider.endpointLabel}</p>
                    </div>
                  </div>
                  <span id="status-${provider.id}" class="settings-status-pill">Checking…</span>
                </div>
                <div class="settings-provider-endpoint">${provider.endpoint}</div>
                <div class="settings-provider-actions">
                  <input
                    type="password"
                    id="key-${provider.id}"
                    class="settings-key-input"
                    placeholder="${provider.placeholder}"
                    autocomplete="off"
                  />
                  <button class="studio-pill-button" data-save="${provider.id}">Save</button>
                  <button class="studio-pill-button" data-test="${provider.id}">Test Proxy</button>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <section id="runtime" class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">Runtime</p>
              <h2 class="studio-section-title">Rust Engine Status</h2>
            </div>
          </div>
          <div class="settings-runtime-grid">
            <article class="settings-runtime-card">
              <span class="settings-runtime-label">Physics engine</span>
              <strong>Native Rust only</strong>
              <p>No WASM worker fallback. All numerical integration runs through the desktop Rust engine.</p>
            </article>
            <article class="settings-runtime-card">
              <span class="settings-runtime-label">Local model path</span>
              <strong>Disabled for studio flow</strong>
              <p>The rebuilt workstation uses the Rust simulation engine for numerical work and external providers for assistant features.</p>
            </article>
            <article class="settings-runtime-card">
              <span class="settings-runtime-label">LLM proxy</span>
              <strong id="llm-health">Checking…</strong>
              <p>Embedded Rust proxy on port 5001 dispatches provider requests with your local keys.</p>
            </article>
            <article class="settings-runtime-card">
              <span class="settings-runtime-label">Data service</span>
              <strong id="model-health">Checking…</strong>
              <p>Model/data service on port 5002 remains available for engine-backed utilities and diagnostics.</p>
            </article>
          </div>
        </section>

        <section id="security" class="studio-section">
          <div class="studio-section-heading">
            <div>
              <p class="studio-kicker">Storage</p>
              <h2 class="studio-section-title">Operational Notes</h2>
            </div>
          </div>
          <div class="settings-note-stack">
            <article class="settings-note-card">
              <h3>Key persistence</h3>
              <p>${IS_TAURI ? "Tauri stores API keys in the native keychain and clears legacy aliases when you resave a provider." : "Browser mode stores keys in localStorage for local development only."}</p>
            </article>
            <article class="settings-note-card">
              <h3>Chinese endpoints</h3>
              <p>Moonshot routes through <code>api.moonshot.cn</code>, Qwen uses Alibaba Cloud’s compatible-mode endpoint, and MiniMax uses the Anthropic-compatible China host at <code>api.minimaxi.com/anthropic</code>.</p>
            </article>
            <article class="settings-note-card">
              <h3>Studio migration</h3>
              <p>The main landing page remains intact. The workstation and settings surfaces are being rebuilt as studio-grade tools around the same Rust simulation core.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  `;

  const navItems = contentArea.querySelectorAll<HTMLButtonElement>(".settings-nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      navItems.forEach((button) => button.classList.toggle("active", button === item));
      document.getElementById(target || "")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  scrollRoot.addEventListener("scroll", () => {
    const sections = ["providers", "runtime", "security"];
    let current = "providers";
    for (const id of sections) {
      const section = document.getElementById(id);
      if (!section) continue;
      if (section.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top < 180) {
        current = id;
      }
    }

    navItems.forEach((button) => button.classList.toggle("active", button.dataset.target === current));
  });

  for (const provider of PROVIDER_CATALOG) {
    void hasStoredKey(provider.id, provider.aliases).then((configured) => {
      const status = document.getElementById(`status-${provider.id}`);
      const input = document.getElementById(`key-${provider.id}`) as HTMLInputElement | null;
      if (!status) return;
      status.textContent = configured ? "Configured" : "Not configured";
      status.classList.toggle("is-configured", configured);
      if (configured && input && IS_TAURI) {
        input.placeholder = "Stored in keychain";
      }
    });
  }

  void probe(LLM_HEALTH).then((healthy) => {
    const el = document.getElementById("llm-health");
    if (el) el.textContent = healthy ? "Online" : "Offline";
  });

  void probe(MODEL_HEALTH).then((healthy) => {
    const el = document.getElementById("model-health");
    if (el) el.textContent = healthy ? "Online" : "Offline";
  });

  contentArea.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const saveId = target.getAttribute("data-save");
    const testId = target.getAttribute("data-test");

    if (saveId) {
      const provider = PROVIDER_CATALOG.find((entry) => entry.id === saveId);
      const input = document.getElementById(`key-${saveId}`) as HTMLInputElement | null;
      const status = document.getElementById(`status-${saveId}`);
      if (!provider || !input || !status) return;

      const value = input.value.trim();
      void saveKey(provider.id, value, provider.aliases)
        .then(() => {
          status.textContent = value ? "Configured" : "Not configured";
          status.classList.toggle("is-configured", Boolean(value));
          input.value = "";
          if (value && IS_TAURI) {
            input.placeholder = "Stored in keychain";
          }
          showToast(`${provider.name} ${value ? "saved" : "cleared"}`, "success");
        })
        .catch((error) => {
          status.textContent = "Error";
          showToast(error instanceof Error ? error.message : String(error), "error");
        });
    }

    if (testId) {
      const provider = PROVIDER_CATALOG.find((entry) => entry.id === testId);
      const status = document.getElementById(`status-${testId}`);
      if (!provider || !status) return;

      status.textContent = "Testing…";
      Promise.all([
        hasStoredKey(provider.id, provider.aliases),
        probe(LLM_HEALTH),
      ])
        .then(([configured, proxyOnline]) => {
          if (!configured) {
            status.textContent = "Missing key";
            status.classList.remove("is-configured");
            return;
          }
          status.textContent = proxyOnline ? "Proxy ready" : "Proxy offline";
          status.classList.toggle("is-configured", proxyOnline);
        })
        .catch((error) => {
          status.textContent = "Test failed";
          showToast(error instanceof Error ? error.message : String(error), "error");
        });
    }
  });
}
