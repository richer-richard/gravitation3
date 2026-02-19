import type { Router } from "../router";
import { SIMULATIONS } from "../data/simulations";
import { createPageShell } from "../components/PageShell";
import { setupScrollAnimations } from "../components/ScrollAnimator";

export function renderExplore(container: HTMLElement, router: Router): void {
  const { contentArea, scrollRoot } = createPageShell(container, router);

  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto px-6">
      <!-- Hero -->
      <div class="text-center mb-16">
        <h1 class="page-title text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Launch Workstation
        </h1>
        <p class="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
          Choose a dynamical system to explore interactively.
        </p>
      </div>

      <!-- Sim Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${SIMULATIONS.map(
          (sim) => `
          <a href="/sim/${sim.id}" data-link
             class="sim-card group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:scale-[1.02] hover:-translate-y-1">

            <!-- Top accent bar -->
            <div class="sim-card-accent bg-gradient-to-r ${sim.gradient}"></div>

            <!-- Glow on hover -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                 style="background:radial-gradient(ellipse at 50% 0%,${sim.glow},transparent 70%)"></div>

            <!-- Preview area -->
            <div class="sim-card-preview m-4 mb-0">
              <div class="sim-card-preview-inner flex items-center justify-center">
                ${sim.previewSvg}
              </div>
              <!-- Category badge -->
              <div class="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/40 backdrop-blur-sm text-zinc-400 border border-white/[0.06]">
                ${sim.category}
              </div>
              <!-- Equation badge -->
              <div class="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] rounded-md bg-black/40 backdrop-blur-sm text-zinc-500 border border-white/[0.06] font-mono">
                ${sim.equation}
              </div>
            </div>

            <!-- Content -->
            <div class="relative p-5 pt-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  ${sim.icon}
                </div>
                <div>
                  <h3 class="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors leading-tight">
                    ${sim.name}
                  </h3>
                  <p class="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors mt-0.5">
                    ${sim.tagline}
                  </p>
                </div>
              </div>

              <p class="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                ${sim.detail}
              </p>

              <!-- Launch bar -->
              <div class="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span class="text-xs font-medium bg-gradient-to-r ${sim.gradient} bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                  Open simulation
                </span>
                <div class="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <path d="M5 3l4 4-4 4"/>
                  </svg>
                </div>
              </div>
            </div>
          </a>
        `
        ).join("")}
      </div>
    </div>
  `;

  // Scroll animations
  setupScrollAnimations(scrollRoot, ".sim-card");
}
