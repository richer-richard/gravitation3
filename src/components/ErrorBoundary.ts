/**
 * ErrorBoundary — error recovery UI for simulation crashes.
 * Catches unhandled errors and provides recovery options.
 */

export interface ErrorBoundaryOptions {
  onReset?: () => void;
  onGoHome?: () => void;
}

export class ErrorBoundary {
  private container: HTMLElement;
  private options: ErrorBoundaryOptions;
  private boundErrorHandler: (e: ErrorEvent) => void;
  private boundRejectionHandler: (e: PromiseRejectionEvent) => void;
  private errorOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement, options: ErrorBoundaryOptions = {}) {
    this.container = container;
    this.options = options;
    this.boundErrorHandler = this.handleError.bind(this);
    this.boundRejectionHandler = this.handleRejection.bind(this);
  }

  attach(): void {
    window.addEventListener("error", this.boundErrorHandler);
    window.addEventListener("unhandledrejection", this.boundRejectionHandler);
  }

  detach(): void {
    window.removeEventListener("error", this.boundErrorHandler);
    window.removeEventListener("unhandledrejection", this.boundRejectionHandler);
    this.dismiss();
  }

  private handleError(e: ErrorEvent): void {
    this.showError(e.message, e.error?.stack);
  }

  private handleRejection(e: PromiseRejectionEvent): void {
    const message = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const stack = e.reason instanceof Error ? e.reason.stack : undefined;
    this.showError(message, stack);
  }

  showError(message: string, stack?: string): void {
    if (this.errorOverlay) return; // Already showing

    this.errorOverlay = document.createElement("div");
    this.errorOverlay.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm";

    this.errorOverlay.innerHTML = `
      <div class="bg-zinc-800 rounded-xl border border-red-500/30 shadow-2xl w-[480px] p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">&#9888;</span>
          <h2 class="text-lg font-semibold text-red-400">Simulation Error</h2>
        </div>
        <p class="text-sm text-zinc-300 mb-3">${escapeHtml(message)}</p>
        ${
          stack
            ? `<details class="mb-4">
                <summary class="text-xs text-zinc-500 cursor-pointer">Stack trace</summary>
                <pre class="mt-2 text-xs text-zinc-500 bg-zinc-900 rounded p-3 overflow-auto max-h-40">${escapeHtml(stack)}</pre>
              </details>`
            : ""
        }
        <div class="flex gap-3">
          <button class="err-reset flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Reset Simulation
          </button>
          <button class="err-home px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors">
            Go Home
          </button>
          <button class="err-dismiss px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.errorOverlay);

    this.errorOverlay.querySelector(".err-reset")?.addEventListener("click", () => {
      this.dismiss();
      this.options.onReset?.();
    });

    this.errorOverlay.querySelector(".err-home")?.addEventListener("click", () => {
      this.dismiss();
      this.options.onGoHome?.();
    });

    this.errorOverlay.querySelector(".err-dismiss")?.addEventListener("click", () => {
      this.dismiss();
    });
  }

  dismiss(): void {
    this.errorOverlay?.remove();
    this.errorOverlay = null;
  }

  destroy(): void {
    this.detach();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
