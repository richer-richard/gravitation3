/**
 * ChatPanel — AI chat interface component.
 * Displays chat messages with markdown rendering, model selector, input,
 * server health check, status pill, and simulation-aware suggestions.
 */

import { ChatManager } from "../ai/ChatManager";
import type { AIModel, StreamEvent } from "../ai/types";
import { MODELS, getModelsForProvider } from "../ai/registry";
import { renderMarkdown } from "./MarkdownRenderer";
import type { SimulationType } from "../simulations/types";

const LLM_BASE = "http://localhost:5001";

const SIM_SUGGESTIONS: Record<string, string[]> = {
  "three-body": [
    "What makes the figure-8 orbit stable?",
    "How does energy drift affect accuracy?",
    "Suggest parameters for a chaotic 4-body system",
  ],
  "double-pendulum": [
    "Why is the double pendulum chaotic?",
    "What is the Lyapunov exponent here?",
    "How do masses affect chaos onset?",
  ],
  lorenz: [
    "Explain the butterfly effect in this system",
    "What happens at ρ = 24.74?",
    "Why are there two attractor lobes?",
  ],
  rossler: [
    "How does the Rössler differ from Lorenz?",
    "Explain the period-doubling route",
    "What controls the screw vs funnel type?",
  ],
  "double-gyre": [
    "What role does ε play in mixing?",
    "How do Lagrangian coherent structures form?",
    "Explain the transport barriers",
  ],
  "lid-driven-cavity": [
    "What happens at high Reynolds numbers?",
    "Why do corner vortices form?",
    "Explain the benchmark Re=400 case",
  ],
  "malkus-waterwheel": [
    "How is this related to the Lorenz system?",
    "What causes direction reversals?",
    "Explain the transition to chaos",
  ],
};

export class ChatPanel {
  private container: HTMLElement;
  private chatManager: ChatManager;
  private messageList!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private modelSelect!: HTMLSelectElement;
  private thinkingToggle!: HTMLInputElement;
  private statusEl!: HTMLElement;
  private streamingContent = "";
  private streamingThinking = "";
  private streamingEl: HTMLElement | null = null;
  private tokenUsage = { input: 0, output: 0 };
  private tokenEl: HTMLElement | null = null;
  private stateGetter: (() => unknown) | null = null;
  private onApplyParams: ((params: Record<string, number>) => void) | null = null;
  private simType: SimulationType = "three-body";
  private serverOnline = false;

  constructor(container: HTMLElement, model: AIModel) {
    this.container = container;
    this.chatManager = new ChatManager(model);
  }

  setStateGetter(getter: () => unknown): void {
    this.stateGetter = getter;
  }

  setOnApplyParams(cb: (params: Record<string, number>) => void): void {
    this.onApplyParams = cb;
  }

  setSimulation(sim: SimulationType): void {
    this.simType = sim;
    this.chatManager.setSimulation(sim);
  }

  render(): void {
    this.container.innerHTML = `
      <div class="chat-shell">
        <div class="chat-toolbar">
          <div class="chat-toolbar-left">
            <select class="chat-model-select studio-select">
              ${this.buildModelOptions()}
            </select>
            <label class="chat-thinking-label">
              <input type="checkbox" class="chat-thinking-toggle" />
              <span>Think</span>
            </label>
          </div>
          <div class="chat-toolbar-right">
            <span class="chat-status" data-status="checking">
              <span class="chat-status-dot"></span>
              <span class="chat-status-text">Checking…</span>
            </span>
          </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-token-usage hidden"></div>
        <div class="chat-input-area">
          <textarea class="chat-input" rows="2" placeholder="Ask about the simulation..."></textarea>
          <button class="chat-send" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2L7 9"/><path d="M14 2l-5 12-2-5-5-2z"/></svg>
          </button>
        </div>
      </div>
    `;

    this.messageList = this.container.querySelector(".chat-messages")!;
    this.input = this.container.querySelector(".chat-input")!;
    this.sendBtn = this.container.querySelector(".chat-send")!;
    this.modelSelect = this.container.querySelector(".chat-model-select")!;
    this.thinkingToggle = this.container.querySelector(".chat-thinking-toggle")!;
    this.statusEl = this.container.querySelector(".chat-status")!;
    this.tokenEl = this.container.querySelector(".chat-token-usage")!;

    this.sendBtn.addEventListener("click", () => this.handleSend());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.input.addEventListener("input", () => {
      this.sendBtn.disabled = !this.input.value.trim();
    });

    this.modelSelect.addEventListener("change", () => {
      const model = MODELS.find((m) => m.id === this.modelSelect.value);
      if (model) {
        this.chatManager.setModel(model);
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

    // Render persisted messages or welcome
    const messages = this.chatManager.getMessages();
    const hasUserMessages = messages.some(m => m.role !== "system");
    if (hasUserMessages) {
      this.renderPersistedMessages();
    } else {
      this.renderWelcome();
    }

    // Check server health
    this.checkServerHealth();
  }

  private async checkServerHealth(): Promise<void> {
    this.setStatus("checking", "Checking…");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${LLM_BASE}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        this.serverOnline = true;
        this.setStatus("online", "Connected");
      } else {
        this.serverOnline = false;
        this.setStatus("offline", "Server Error");
      }
    } catch {
      this.serverOnline = false;
      this.setStatus("offline", "Offline");
    }
  }

  private setStatus(status: "online" | "offline" | "checking", text: string): void {
    if (!this.statusEl) return;
    this.statusEl.dataset.status = status;
    const textEl = this.statusEl.querySelector(".chat-status-text");
    if (textEl) textEl.textContent = text;
  }

  private renderWelcome(): void {
    const suggestions = SIM_SUGGESTIONS[this.simType] || SIM_SUGGESTIONS["three-body"];
    this.messageList.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">🤖</div>
        <h4>Simulation Copilot</h4>
        <p>Ask questions about the physics, request parameter changes, or get insights about the current simulation state.</p>
        <div class="chat-suggestions">
          ${suggestions.map(s => `<button class="chat-suggestion">${s}</button>`).join("")}
        </div>
      </div>
    `;

    this.messageList.querySelectorAll<HTMLButtonElement>(".chat-suggestion").forEach(btn => {
      btn.addEventListener("click", () => {
        this.input.value = btn.textContent || "";
        this.sendBtn.disabled = false;
        this.input.focus();
      });
    });
  }

  private renderPersistedMessages(): void {
    const messages = this.chatManager.getMessages();
    for (const msg of messages) {
      if (msg.role === "system") continue;
      this.appendMessage(msg.role, msg.content, msg.thinking);
    }
  }

  private buildModelOptions(): string {
    const providers = ["anthropic", "openai", "google", "deepseek", "moonshot", "qwen", "minimax"];
    let html = "";
    for (const provider of providers) {
      const models = getModelsForProvider(provider);
      if (models.length > 0) {
        const label = provider === "google"
          ? "Google"
          : provider === "moonshot"
            ? "Moonshot"
            : provider === "qwen"
              ? "Qwen"
              : provider === "minimax"
                ? "MiniMax"
                : provider.charAt(0).toUpperCase() + provider.slice(1);
        html += `<optgroup label="${label}">`;
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

    // Clear welcome if visible
    const welcome = this.messageList.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    this.input.value = "";
    this.sendBtn.disabled = true;

    // Add user message to UI
    this.appendMessage("user", content);

    // Check server first
    if (!this.serverOnline) {
      await this.checkServerHealth();
      if (!this.serverOnline) {
        this.appendMessage("assistant", "**⚠ Server Offline**\n\nThe AI server at `localhost:5001` is not reachable. Please start it and try again.\n\n```bash\ncargo run --manifest-path server/Cargo.toml\n```");
        this.sendBtn.disabled = false;
        return;
      }
    }

    // Stream response
    this.streamingContent = "";
    this.streamingThinking = "";
    this.streamingEl = this.createStreamingMessage();

    try {
      const simState = this.stateGetter?.();
      const generator = this.chatManager.sendMessageStream(content, {
        thinking: this.thinkingToggle.checked,
        simulationState: simState,
      });

      for await (const event of generator) {
        this.handleStreamEvent(event);
      }
    } catch {
      if (this.streamingContent === "") {
        this.streamingContent = "**Connection Error**\n\nFailed to reach the AI server. Please check that the server is running.";
        this.updateStreamingMessage();
      }
    }

    // Finalize streaming message
    if (this.streamingEl) {
      this.finalizeStreamingMessage();
    }

    this.sendBtn.disabled = !this.input.value.trim();
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
    } else if (event.type === "done" && event.usage) {
      this.tokenUsage.input += event.usage.input_tokens;
      this.tokenUsage.output += event.usage.output_tokens;
      this.updateTokenDisplay();
    } else if (event.type === "error" && event.message) {
      this.streamingContent += `\n\n**Error:** ${event.message}`;
      this.updateStreamingMessage();
    }
  }

  private appendMessage(role: string, content: string, thinking?: string): void {
    const el = document.createElement("div");
    el.className = `chat-message chat-message-${role}`;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${role}`;

    // Role label
    const roleLabel = document.createElement("div");
    roleLabel.className = "chat-role-label";
    roleLabel.textContent = role === "user" ? "You" : "Copilot";
    bubble.appendChild(roleLabel);

    if (thinking) {
      const thinkEl = document.createElement("details");
      thinkEl.className = "chat-thinking-block";
      thinkEl.innerHTML = `<summary>Thinking…</summary><div class="chat-thinking-content">${renderMarkdown(thinking)}</div>`;
      bubble.appendChild(thinkEl);
    }

    const contentEl = document.createElement("div");
    contentEl.className = "chat-content markdown-body";
    contentEl.innerHTML =
      role === "user" ? escapeHtml(content) : renderMarkdown(content);
    bubble.appendChild(contentEl);

    el.appendChild(bubble);
    this.messageList.appendChild(el);
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private createStreamingMessage(): HTMLElement {
    const el = document.createElement("div");
    el.className = "chat-message chat-message-assistant";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble-assistant streaming";

    const roleLabel = document.createElement("div");
    roleLabel.className = "chat-role-label";
    roleLabel.textContent = "Copilot";
    bubble.appendChild(roleLabel);

    const thinkEl = document.createElement("details");
    thinkEl.className = "chat-thinking-block thinking-section hidden";
    thinkEl.open = true;
    thinkEl.innerHTML = `<summary>Thinking…</summary><div class="thinking-content chat-thinking-content"></div>`;
    bubble.appendChild(thinkEl);

    const contentEl = document.createElement("div");
    contentEl.className = "content-section chat-content markdown-body";
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
      contentSection.innerHTML = renderMarkdown(this.streamingContent) || '<span class="chat-typing-indicator">●●●</span>';
    }

    this.messageList.scrollTop = this.messageList.scrollHeight;
  }

  private updateTokenDisplay(): void {
    if (!this.tokenEl) return;
    if (this.tokenUsage.input > 0 || this.tokenUsage.output > 0) {
      this.tokenEl.classList.remove("hidden");
      this.tokenEl.textContent = `Tokens: ${this.tokenUsage.input.toLocaleString()} in · ${this.tokenUsage.output.toLocaleString()} out`;
    }
  }

  private finalizeStreamingMessage(): void {
    if (!this.streamingEl) return;
    const bubble = this.streamingEl.querySelector(".streaming");
    if (bubble) bubble.classList.remove("streaming");

    // Detect parameter blocks in response and add "Apply" button
    this.detectParameterBlocks(this.streamingEl, this.streamingContent);

    this.streamingEl = null;
  }

  private detectParameterBlocks(el: HTMLElement, content: string): void {
    // Look for ```parameters code blocks
    const match = content.match(/```parameters\s*\n([\s\S]*?)```/);
    if (!match || !this.onApplyParams) return;

    try {
      const params = JSON.parse(match[1]) as Record<string, number>;
      const btn = document.createElement("button");
      btn.className = "chat-apply-params";
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2l-7 7M6 9l-3 5 5-3"/></svg>
        Apply Parameters
      `;
      btn.addEventListener("click", () => {
        this.onApplyParams?.(params);
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8l4 4 6-8"/></svg>
          Applied!
        `;
        btn.disabled = true;
        btn.classList.add("is-applied");
      });
      const bubble = el.querySelector(".content-section") || el.querySelector("div > div");
      bubble?.appendChild(btn);
    } catch { /* not valid JSON */ }
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
