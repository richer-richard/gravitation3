import type { Router } from "../router";
import { createPageShell } from "../components/PageShell";
import { setupScrollAnimations } from "../components/ScrollAnimator";

const TECH_STACK = [
  {
    name: "Rust Physics Core",
    description: "Native Rust physics engine with deterministic stepping, collision tracking, and zero browser bridge overhead on desktop.",
    accent: "#f59e0b",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  {
    name: "Three.js",
    description: "Real-time 3D visualisation with WebGL rendering — smooth, interactive, and beautiful on any desktop computer.",
    accent: "#3b82f6",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  },
  {
    name: "Tauri 2",
    description: "Native desktop app with Rust physics, OS keychain integration, and macOS menu bar. Full OS-level integration.",
    accent: "#8b5cf6",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  },
  {
    name: "Studio Workstations",
    description: "Purpose-built workstation surfaces for chaos systems and CFD studies, with inspector rails, transport controls, and diagnostics.",
    accent: "#10b981",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M4 19V5l4 4 4-6 4 6 4-4v14"/></svg>`,
  },
  {
    name: "Multi-AI Chat",
    description: "Converse with Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, and MiniMax about your simulation. Streaming with thinking support.",
    accent: "#ec4899",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-4 6v2h-6v-2C7 14 5 12 5 9a7 7 0 0 1 7-7z"/><path d="M9 21h6"/></svg>`,
  },
  {
    name: "KaTeX",
    description: "Publication-quality mathematical typesetting rendered directly in the browser — equations as beautiful as the physics.",
    accent: "#0ea5e9",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M4 4h6l-3 16M14 4h6l-3 16"/></svg>`,
  },
];

const IMPACT_ITEMS = [
  { title: "Space Mission Planning", detail: "Three-body dynamics shape halo orbits, lunar flybys, and low-fuel transfers." },
  { title: "Climate & Weather", detail: "Lorenz attractors and convection cells mirror feedback loops inside weather models." },
  { title: "Engineering Dynamics", detail: "Cranes, robot arms, and bridges flirt with the same chaotic swings seen in a double pendulum." },
  { title: "Biological Systems", detail: "Oscillating reactions and predator-prey loops mirror cardiac rhythms and ecosystem balance." },
  { title: "Fluid Engineering", detail: "Vortex patterns inform aircraft design, exhaust stacks, and pipeline stability." },
  { title: "Energy Systems", detail: "The Malkus waterwheel mirrors energy extraction in turbines and hydropower." },
];

export function renderAbout(container: HTMLElement, router: Router): void {
  const { contentArea, scrollRoot } = createPageShell(container, router);

  contentArea.innerHTML = `
    <div class="max-w-4xl mx-auto px-6">

      <!-- Hero -->
      <div class="text-center mb-20">
        <h1 class="page-title text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          About Gravitation<sup class="text-2xl">3</sup>
        </h1>
        <p class="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Understanding our purpose, impact, and the role of AI in making complex systems accessible to everyone.
        </p>
      </div>

      <!-- ═══ Why We Built This ═══ -->
      <section class="anim-target glass-card p-8 sm:p-10 mb-8">
        <h2 class="section-title text-2xl font-bold text-zinc-100 mb-6">Why We Built This</h2>
        <div class="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>
            <strong class="text-zinc-200">Gravitation&sup3;</strong> started with a simple complaint: every time we tried to explain chaotic motion, we ended up waving our hands at a chalkboard and saying "imagine this curve wobbling forever." Students deserve more than an invitation to imagine — they deserve to <em>see</em> the motion, drag a body, and feel why the math matters.
          </p>
          <p>
            Traditional lessons still treat chaotic systems as a footnote: memorise the equation, maybe watch a low-res animation, then move on. That approach teaches symbols without intuition. Until you see how sensitive everything is to a nudge, the "aha" moment never lands.
          </p>
          <div class="info-callout">
            <p class="text-sm text-zinc-300">
              <strong class="text-blue-400">The gap we aim to close:</strong> interactive, trustworthy simulations are either locked behind expensive lab software or rigid tools that can't be tweaked. Curious learners end up staring at static diagrams when they should be experimenting.
            </p>
          </div>
          <p>
            So we built <strong class="text-zinc-200">Gravitation&sup3;</strong> as a flexible sandbox. Start with a preset, break it immediately, and watch what happens. The visuals pull you in, the controls keep you tinkering, and the math reveals itself along the way.
          </p>
          <p>
            Our vision is straightforward: <strong class="text-zinc-200">make nonlinear dynamics part of everyday scientific literacy</strong>. You shouldn't need a research workstation or graduate coursework to appreciate a figure-eight orbit or a Lorenz attractor.
          </p>
          <p>
            A native desktop laboratory removes the usual gatekeepers. Install it on any computer, stream it in a lecture hall, or share your experiment data with a colleague — the experience is the same everywhere. Learning becomes less about memorising formulas and more about prodding the system yourself.
          </p>
        </div>
      </section>

      <!-- ═══ Real-World Impact ═══ -->
      <section class="anim-target glass-card p-8 sm:p-10 mb-8">
        <h2 class="section-title text-2xl font-bold text-zinc-100 mb-6">Real-World Impact</h2>
        <p class="text-sm text-zinc-400 leading-relaxed mb-6">
          These simulations mirror real systems that engineers, scientists, and mission planners work with daily:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${IMPACT_ITEMS.map(
            (item) => `
            <div class="anim-target p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <h3 class="text-sm font-semibold text-zinc-200 mb-1">${item.title}</h3>
              <p class="text-xs text-zinc-500 leading-relaxed">${item.detail}</p>
            </div>
          `
          ).join("")}
        </div>
      </section>

      <!-- ═══ Technology Showcase ═══ -->
      <section class="anim-target glass-card p-8 sm:p-10 mb-8">
        <h2 class="section-title text-2xl font-bold text-zinc-100 mb-6">Technology</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${TECH_STACK.map(
            (tech) => `
            <div class="anim-target tech-card group">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.06] bg-white/[0.03] group-hover:border-white/[0.1] transition-all" style="color:${tech.accent}">
                  ${tech.icon}
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">${tech.name}</h3>
                  <p class="mt-1 text-xs text-zinc-500 leading-relaxed">${tech.description}</p>
                </div>
              </div>
            </div>
          `
          ).join("")}
        </div>
      </section>

      <!-- ═══ AI Philosophy ═══ -->
      <section class="anim-target glass-card p-8 sm:p-10 mb-8">
        <h2 class="section-title text-2xl font-bold text-zinc-100 mb-6">AI Philosophy</h2>
        <div class="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>
            AI is useful when it removes friction, not when it becomes the show. We use it sparingly to surface helpful hints, keep simulations smooth, and highlight behaviours you might have missed.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
            <div class="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <h4 class="text-sm font-semibold text-zinc-200 mb-1">Intelligent Tutoring</h4>
              <p class="text-xs text-zinc-500">Contextual tips matching what you're adjusting — just enough guidance to connect the slider to the physics.</p>
            </div>
            <div class="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <h4 class="text-sm font-semibold text-zinc-200 mb-1">Pattern Recognition</h4>
              <p class="text-xs text-zinc-500">Background analysis looks for repeating orbits, drifts, or bifurcations and flags interesting runs.</p>
            </div>
            <div class="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <h4 class="text-sm font-semibold text-zinc-200 mb-1">Predictive Analytics</h4>
              <p class="text-xs text-zinc-500">Classifiers estimate when a system is about to leave a stable state, giving you a heads-up to pause or export.</p>
            </div>
          </div>
          <div class="info-callout">
            <p class="text-sm text-zinc-300">
              <strong class="text-blue-400">Responsibility first:</strong> Every AI-assisted feature stays explainable, optional, and grounded in verifiable simulation data. If it can't point back to the physics, it doesn't ship.
            </p>
          </div>
        </div>
      </section>

      <!-- ═══ Open Source ═══ -->
      <section class="anim-target glass-card p-8 sm:p-10 mb-8">
        <h2 class="section-title text-2xl font-bold text-zinc-100 mb-4">Open Source</h2>
        <p class="text-sm text-zinc-400 leading-relaxed">
          Gravitation&sup3; is released under the <strong class="text-zinc-200">Apache 2.0 License</strong>. We believe scientific tools should be free, auditable, and community-driven. Contributions, bug reports, and feature requests are welcome.
        </p>
      </section>

    </div>
  `;

  // Scroll animations
  setupScrollAnimations(scrollRoot, ".anim-target");
}
