/**
 * PageShell — reusable wrapper for all content pages (not Home, not Simulation).
 * Provides full-viewport scroll container, fixed nav, starfield background, and footer.
 */

import type { Router } from "../router";
import { Starfield } from "./Starfield";

export interface PageShellResult {
  contentArea: HTMLElement;
  scrollRoot: HTMLElement;
  cleanup: () => void;
}

export function createPageShell(
  container: HTMLElement,
  router: Router,
  options?: { title?: string }
): PageShellResult {
  let starfield: Starfield | null = null;

  container.innerHTML = `
    <div class="page-scroll relative" style="overflow-y:auto;height:100vh;">

      <!-- ═══ NAV ═══ -->
      <nav class="fixed top-0 left-0 right-0 z-30 page-nav">
        <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" data-link class="text-sm font-semibold tracking-wide text-zinc-300 hover:text-white transition-colors">
            Gravitation<sup>3</sup>
          </a>
          <div class="flex items-center gap-6 text-xs text-zinc-500">
            <a href="/explore" data-link class="hover:text-zinc-200 transition-colors">Explore</a>
            <a href="/docs" data-link class="hover:text-zinc-200 transition-colors">Docs</a>
            <a href="/physics" data-link class="hover:text-zinc-200 transition-colors">Physics</a>
            <a href="/about" data-link class="hover:text-zinc-200 transition-colors">About</a>
            <a href="/settings" data-link
               class="ml-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 transition-all">
              Settings
            </a>
          </div>
        </div>
      </nav>

      <!-- ═══ CONTENT ═══ -->
      <div class="page-content relative z-10 pt-20 pb-24 min-h-screen"></div>

      <!-- ═══ FOOTER ═══ -->
      <footer class="relative z-10 border-t border-white/[0.05] py-10">
        <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span class="text-xs text-zinc-600">Apache 2.0 License</span>
          <div class="flex items-center gap-6 text-xs text-zinc-600">
            <a href="/about" data-link class="hover:text-zinc-300 transition-colors">About</a>
            <a href="/physics" data-link class="hover:text-zinc-300 transition-colors">Physics</a>
            <a href="/docs" data-link class="hover:text-zinc-300 transition-colors">Docs</a>
            <a href="/settings" data-link class="hover:text-zinc-300 transition-colors">Settings</a>
          </div>
        </div>
      </footer>
    </div>
  `;

  const scrollRoot = container.querySelector(".page-scroll") as HTMLElement;
  const contentArea = container.querySelector(".page-content") as HTMLElement;

  // Mount starfield
  if (scrollRoot) {
    starfield = new Starfield(scrollRoot);
  }

  // Nav background on scroll
  const nav = container.querySelector(".page-nav") as HTMLElement;
  if (scrollRoot && nav) {
    scrollRoot.addEventListener("scroll", () => {
      if (scrollRoot.scrollTop > 40) {
        nav.style.background = "rgba(9,9,11,0.85)";
        nav.style.backdropFilter = "blur(12px)";
        nav.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
      } else {
        nav.style.background = "transparent";
        nav.style.backdropFilter = "none";
        nav.style.borderBottom = "1px solid transparent";
      }
    });
  }

  const cleanup = () => {
    starfield?.destroy();
    starfield = null;
  };

  // Register cleanup with router
  router.setCleanup(cleanup);

  return { contentArea, scrollRoot, cleanup };
}
