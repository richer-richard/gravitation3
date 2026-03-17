/**
 * ModelSelector — AI model/provider picker dropdown.
 * Groups models by provider with capability indicators.
 */

import type { AIModel } from "../ai/types";
import { MODELS, getModelsForProvider } from "../ai/registry";

const PROVIDERS = ["anthropic", "openai", "google", "deepseek", "moonshot", "qwen", "minimax"] as const;

export class ModelSelector {
  private container: HTMLElement;
  private selectedModel: AIModel;
  private onChange: (model: AIModel) => void;
  private selectEl!: HTMLSelectElement;

  constructor(
    container: HTMLElement,
    defaultModel: AIModel,
    onChange: (model: AIModel) => void
  ) {
    this.container = container;
    this.selectedModel = defaultModel;
    this.onChange = onChange;
  }

  render(): void {
    this.container.innerHTML = `
      <select class="model-select bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-600 w-full">
        ${PROVIDERS.map((provider) => {
          const models = getModelsForProvider(provider);
          if (models.length === 0) return "";
          const label = provider === "google"
            ? "Google"
            : provider === "moonshot"
              ? "Moonshot"
              : provider === "qwen"
                ? "Qwen"
                : provider === "minimax"
                  ? "MiniMax"
                  : provider.charAt(0).toUpperCase() + provider.slice(1);
          return `
            <optgroup label="${label}">
              ${models
                .map(
                  (m) =>
                    `<option value="${m.id}" ${m.id === this.selectedModel.id ? "selected" : ""}>${m.displayName}${m.capabilities.includes("thinking") ? " *" : ""}</option>`
                )
                .join("")}
            </optgroup>
          `;
        }).join("")}
      </select>
    `;

    this.selectEl = this.container.querySelector(".model-select")!;
    this.selectEl.addEventListener("change", () => {
      const model = MODELS.find((m) => m.id === this.selectEl.value);
      if (model) {
        this.selectedModel = model;
        this.onChange(model);
      }
    });
  }

  getSelected(): AIModel {
    return this.selectedModel;
  }

  hasThinking(): boolean {
    return this.selectedModel.capabilities.includes("thinking");
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
