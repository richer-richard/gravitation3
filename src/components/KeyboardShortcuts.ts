/**
 * KeyboardShortcuts — global shortcut system with help modal.
 * Keys: Space=play/pause, R=reset, T=trails, S=screenshot, E=export, ?=help
 */

export interface ShortcutAction {
  key: string;
  description: string;
  handler: () => void;
  modifier?: "ctrl" | "shift" | "alt";
}

export class KeyboardShortcuts {
  private shortcuts: ShortcutAction[] = [];
  private boundHandler: (e: KeyboardEvent) => void;
  private helpOverlay: HTMLElement | null = null;
  private enabled = true;

  constructor() {
    this.boundHandler = this.handleKeydown.bind(this);
  }

  register(shortcuts: ShortcutAction[]): void {
    this.shortcuts = shortcuts;
    // Add built-in help shortcut
    this.shortcuts.push({
      key: "?",
      description: "Show keyboard shortcuts",
      handler: () => this.toggleHelp(),
      modifier: "shift",
    });
  }

  attach(): void {
    document.addEventListener("keydown", this.boundHandler);
  }

  detach(): void {
    document.removeEventListener("keydown", this.boundHandler);
    this.closeHelp();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // Skip when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
      return;
    }

    for (const shortcut of this.shortcuts) {
      if (shortcut.modifier === "ctrl" && !e.ctrlKey && !e.metaKey) continue;
      if (shortcut.modifier === "shift" && !e.shiftKey) continue;
      if (shortcut.modifier === "alt" && !e.altKey) continue;

      if (e.key === shortcut.key || e.key.toLowerCase() === shortcut.key.toLowerCase()) {
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }

  toggleHelp(): void {
    if (this.helpOverlay) {
      this.closeHelp();
    } else {
      this.showHelp();
    }
  }

  showHelp(): void {
    this.helpOverlay = document.createElement("div");
    this.helpOverlay.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm";

    const rows = this.shortcuts
      .map(
        (s) => `
      <tr class="border-b border-zinc-700/50">
        <td class="py-2 pr-4">
          <kbd class="px-2 py-0.5 bg-zinc-700 rounded text-xs font-mono text-zinc-200">
            ${s.modifier ? s.modifier + " + " : ""}${this.displayKey(s.key)}
          </kbd>
        </td>
        <td class="py-2 text-sm text-zinc-300">${s.description}</td>
      </tr>
    `
      )
      .join("");

    this.helpOverlay.innerHTML = `
      <div class="bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl w-96 p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button class="help-close text-zinc-500 hover:text-zinc-300 text-xl">&times;</button>
        </div>
        <table class="w-full">
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.body.appendChild(this.helpOverlay);

    this.helpOverlay.querySelector(".help-close")?.addEventListener("click", () => this.closeHelp());
    this.helpOverlay.addEventListener("click", (e) => {
      if (e.target === this.helpOverlay) this.closeHelp();
    });
  }

  closeHelp(): void {
    this.helpOverlay?.remove();
    this.helpOverlay = null;
  }

  private displayKey(key: string): string {
    switch (key) {
      case " ": return "Space";
      case "Escape": return "Esc";
      default: return key.toUpperCase();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    this.detach();
  }
}
