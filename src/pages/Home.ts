import type { Router } from "../router";
import { Starfield } from "../components/Starfield";

/* ── Simulation catalogue ── */
const SIMULATIONS = [
  {
    id: "three-body",
    name: "Three-Body Problem",
    category: "Gravitational",
    tagline: "Gravitational dance of three celestial bodies",
    detail:
      "Watch three masses weave unpredictable orbits through gravity alone. Featuring RK4 integration, collision detection, energy tracking, and famous configurations like the figure-eight orbit.",
    equation: "F = Gm\u2081m\u2082 / r\u00b2",
    gradient: "from-blue-500 to-cyan-400",
    accentColor: "#3b82f6",
    glow: "rgba(59,130,246,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="60" rx="50" ry="30" stroke="rgba(59,130,246,0.3)" stroke-width="0.5" stroke-dasharray="3 3"/>
      <ellipse cx="130" cy="60" rx="45" ry="35" stroke="rgba(59,130,246,0.2)" stroke-width="0.5" stroke-dasharray="3 3" transform="rotate(15 130 60)"/>
      <circle cx="55" cy="50" r="6" fill="rgba(96,165,250,0.6)"/><circle cx="55" cy="50" r="6" fill="none" stroke="rgba(96,165,250,0.3)" stroke-width="8"/>
      <circle cx="140" cy="70" r="5" fill="rgba(34,211,238,0.6)"/><circle cx="140" cy="70" r="5" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="6"/>
      <circle cx="100" cy="45" r="4" fill="rgba(167,139,250,0.6)"/><circle cx="100" cy="45" r="4" fill="none" stroke="rgba(167,139,250,0.3)" stroke-width="5"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><circle cx="7" cy="7" r="3"/><circle cx="21" cy="9" r="2.5"/><circle cx="12" cy="21" r="3"/><path d="M9.5 8.5 18.5 9.5M19 11.2 14.5 19M11 18.5 8 10" stroke-dasharray="2 2" opacity=".4"/></svg>`,
  },
  {
    id: "double-pendulum",
    name: "Double Pendulum",
    category: "Mechanical",
    tagline: "Chaotic motion from simple mechanics",
    detail:
      "A pendulum attached to another pendulum. Extreme sensitivity to initial conditions turns two simple rods into one of nature's most mesmerising chaotic systems.",
    equation: "L = T(\u03b8\u0307\u2081,\u03b8\u0307\u2082) \u2212 V(\u03b8\u2081,\u03b8\u2082)",
    gradient: "from-emerald-500 to-teal-400",
    accentColor: "#10b981",
    glow: "rgba(16,185,129,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="15" r="3" fill="rgba(255,255,255,0.15)"/>
      <line x1="100" y1="15" x2="80" y2="55" stroke="rgba(16,185,129,0.5)" stroke-width="1.5"/>
      <circle cx="80" cy="55" r="4" fill="rgba(52,211,153,0.5)"/><circle cx="80" cy="55" r="4" fill="none" stroke="rgba(52,211,153,0.2)" stroke-width="6"/>
      <line x1="80" y1="55" x2="120" y2="95" stroke="rgba(16,185,129,0.4)" stroke-width="1.5"/>
      <circle cx="120" cy="95" r="4" fill="rgba(45,212,191,0.5)"/><circle cx="120" cy="95" r="4" fill="none" stroke="rgba(45,212,191,0.2)" stroke-width="6"/>
      <path d="M120 95 Q 115 80 105 90 Q 95 100 110 105 Q 130 110 125 95" stroke="rgba(52,211,153,0.15)" stroke-width="0.5" fill="none"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><circle cx="14" cy="4" r="2" fill="currentColor"/><line x1="14" y1="6" x2="10" y2="14"/><circle cx="10" cy="14" r="2"/><line x1="10" y1="16" x2="16" y2="24"/><circle cx="16" cy="24" r="2"/></svg>`,
  },
  {
    id: "lorenz",
    name: "Lorenz Attractor",
    category: "Strange Attractor",
    tagline: "The butterfly effect in atmospheric convection",
    detail:
      "Edward Lorenz's iconic equations that launched chaos theory. Trajectories trace the butterfly-shaped strange attractor, never repeating, never crossing.",
    equation: "dx/dt = \u03c3(y \u2212 x)",
    gradient: "from-violet-500 to-purple-400",
    accentColor: "#8b5cf6",
    glow: "rgba(139,92,246,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 60 Q 30 30 40 55 Q 50 80 60 60 Q 70 40 80 60 Q 90 80 100 60" stroke="rgba(139,92,246,0.35)" stroke-width="0.8" fill="none"/>
      <path d="M100 60 Q 110 40 120 55 Q 130 70 140 60 Q 150 50 160 60 Q 170 70 160 55 Q 150 40 140 60" stroke="rgba(167,139,250,0.3)" stroke-width="0.8" fill="none"/>
      <ellipse cx="65" cy="58" rx="30" ry="22" stroke="rgba(139,92,246,0.15)" stroke-width="0.5" fill="none"/>
      <ellipse cx="140" cy="58" rx="28" ry="20" stroke="rgba(167,139,250,0.12)" stroke-width="0.5" fill="none"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><path d="M14 14c-4-4-8-4-9 0s1 8 5 8 7-3 8-8c1 5 4 8 8 8s6-4 5-8-5-4-9 0"/></svg>`,
  },
  {
    id: "rossler",
    name: "R\u00f6ssler Attractor",
    category: "Strange Attractor",
    tagline: "Spiral chaos in three dimensions",
    detail:
      "Otto R\u00f6ssler's elegant system produces spiralling trajectories with a distinctive fold. Simpler than Lorenz, yet deeply complex — a gateway to understanding chaotic attractors.",
    equation: "dx/dt = \u2212y \u2212 z",
    gradient: "from-pink-500 to-rose-400",
    accentColor: "#ec4899",
    glow: "rgba(236,72,153,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 60 Q 60 20 50 60 Q 40 100 80 80 Q 120 60 100 60" stroke="rgba(236,72,153,0.3)" stroke-width="0.8" fill="none"/>
      <path d="M100 60 Q 70 30 55 60 Q 40 90 75 75 Q 110 60 100 60" stroke="rgba(244,114,182,0.2)" stroke-width="0.8" fill="none"/>
      <path d="M100 55 Q 130 25 150 50 Q 170 80 130 60 Q 110 50 100 55" stroke="rgba(251,113,133,0.2)" stroke-width="0.5" fill="none"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><path d="M14 14c0-5 4-9 7-6s3 8-1 10-9 1-10-3 3-8 7-6"/></svg>`,
  },
  {
    id: "double-gyre",
    name: "Double Gyre",
    category: "Fluid Dynamics",
    tagline: "Oceanic flow patterns and mixing",
    detail:
      "A model of oceanic circulation with two counter-rotating vortices. Particles reveal Lagrangian coherent structures and the beautiful complexity of fluid mixing.",
    equation: "\u03c8 = A sin(\u03c0f(x,t)) sin(\u03c0y)",
    gradient: "from-sky-500 to-indigo-400",
    accentColor: "#0ea5e9",
    glow: "rgba(14,165,233,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="65" cy="60" r="30" stroke="rgba(14,165,233,0.2)" stroke-width="0.5" fill="none"/>
      <circle cx="65" cy="60" r="20" stroke="rgba(14,165,233,0.15)" stroke-width="0.5" fill="none"/>
      <circle cx="135" cy="60" r="30" stroke="rgba(99,102,241,0.2)" stroke-width="0.5" fill="none"/>
      <circle cx="135" cy="60" r="20" stroke="rgba(99,102,241,0.15)" stroke-width="0.5" fill="none"/>
      <path d="M65 30 Q 80 60 65 90" stroke="rgba(14,165,233,0.25)" stroke-width="0.5" fill="none"/>
      <path d="M135 30 Q 120 60 135 90" stroke="rgba(99,102,241,0.25)" stroke-width="0.5" fill="none"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><path d="M6 14a5 5 0 1 0 10 0 5 5 0 1 0-10 0"/><path d="M12 14a5 5 0 1 0 10 0 5 5 0 1 0-10 0"/></svg>`,
  },
  {
    id: "malkus-waterwheel",
    name: "Malkus Waterwheel",
    category: "Mechanical",
    tagline: "Mechanical chaos with water and gravity",
    detail:
      "Water drips into leaky rotating buckets. This mechanical analogue of the Lorenz attractor produces chaotic direction reversals — order and chaos from a simple machine.",
    equation: "d\u03c9/dt = \u2212\u03bd\u03c9 + gRa\u2081/I",
    gradient: "from-amber-500 to-orange-400",
    accentColor: "#f59e0b",
    glow: "rgba(245,158,11,0.18)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="65" r="35" stroke="rgba(245,158,11,0.25)" stroke-width="0.8" fill="none"/>
      <circle cx="100" cy="65" r="5" fill="rgba(245,158,11,0.2)"/>
      <line x1="100" y1="65" x2="100" y2="30" stroke="rgba(245,158,11,0.2)" stroke-width="0.5"/>
      <line x1="100" y1="65" x2="130" y2="80" stroke="rgba(245,158,11,0.2)" stroke-width="0.5"/>
      <line x1="100" y1="65" x2="70" y2="80" stroke="rgba(245,158,11,0.2)" stroke-width="0.5"/>
      <rect x="95" y="26" width="10" height="8" rx="2" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.3)" stroke-width="0.5"/>
      <rect x="126" y="76" width="10" height="8" rx="2" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.3)" stroke-width="0.5" transform="rotate(60 131 80)"/>
      <rect x="64" y="76" width="10" height="8" rx="2" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.3)" stroke-width="0.5" transform="rotate(-60 69 80)"/>
      <line x1="100" y1="10" x2="100" y2="22" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" stroke-dasharray="2 2"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><circle cx="14" cy="15" r="8"/><circle cx="14" cy="15" r="2" fill="currentColor"/><line x1="14" y1="3" x2="14" y2="7"/><path d="M11 4h6" stroke-linecap="round"/></svg>`,
  },
];

/* ── Tech features ── */
const FEATURES = [
  {
    title: "Rust Physics Core",
    description:
      "Native Rust simulation core with deterministic stepping, collision tracking, and desktop-class performance.",
    accent: "#3b82f6",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  {
    title: "AI-Powered Analysis",
    description:
      "Chat with Claude, GPT, Gemini, DeepSeek, Kimi, Qwen, and MiniMax about your simulation. Streaming responses with thinking support.",
    accent: "#8b5cf6",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-4 6v2h-6v-2C7 14 5 12 5 9a7 7 0 0 1 7-7z"/><path d="M9 21h6"/><path d="M10 17h4"/></svg>`,
  },
  {
    title: "Studio Workstations",
    description:
      "Dedicated production surfaces for chaos systems and CFD studies, with polished transport controls, inspectors, and diagnostics.",
    accent: "#10b981",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><path d="M4 19V5l4 4 4-6 4 6 4-4v14"/></svg>`,
  },
  {
    title: "Native Desktop App",
    description:
      "Tauri-powered macOS app with native Rust physics, OS keychain integration, and zero browser bridge overhead.",
    accent: "#f59e0b",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  },
];

/* ── Main render ── */
export function renderHome(container: HTMLElement, _router: Router): void {
  let starfield: Starfield | null = null;

  container.innerHTML = `
    <div class="home-scroll relative" style="overflow-y:auto;height:100vh;">

      <!-- ═══ NAV ═══ -->
      <nav class="fixed top-0 left-0 right-0 z-30 home-nav">
        <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" data-link class="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300 hover:text-white transition-colors">
            <img src="/logo-mark.svg" alt="" class="w-5 h-5 rounded-[6px] shadow-[0_0_16px_rgba(241,118,176,0.18)]" />
            <span>Gravitation<sup>3</sup></span>
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

      <!-- ═══ HERO — full viewport ═══ -->
      <header class="relative z-10 flex flex-col items-center justify-center px-6 min-h-screen text-center">
        <!-- Decorative orbit rings -->
        <div class="hero-orbit-ring absolute w-[600px] h-[600px] rounded-full border border-white/[0.03]"></div>
        <div class="hero-orbit-ring-2 absolute w-[420px] h-[420px] rounded-full border border-white/[0.04]"></div>

        <!-- Title with animated gradient + shine -->
        <h1 class="hero-title select-none">
          <span class="hero-title-shine">
            <span class="hero-title-text text-[6rem] sm:text-[7.5rem] lg:text-[9rem] font-extrabold tracking-tighter leading-[0.9]">
              Gravitation
            </span><sup class="hero-sup text-[2.5rem] sm:text-[3.5rem] lg:text-[4.5rem] font-bold align-super relative -left-2">3</sup>
          </span>
        </h1>

        <!-- Famous quote -->
        <p class="hero-quote mt-8 text-sm sm:text-base italic text-zinc-500 max-w-lg leading-relaxed">
          &ldquo;The scientist does not study nature because it is useful; he studies it because he delights in it,
          and he delights in it because it is beautiful.&rdquo;
          <span class="block mt-1 text-xs text-zinc-600 not-italic">&mdash; Henri Poincar&eacute;</span>
        </p>

        <!-- Description -->
        <p class="hero-tagline mt-8 text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
          Interactive physics simulations powered by <span class="text-zinc-200 font-medium">Rust</span>,
          <span class="text-zinc-200 font-medium">native desktop performance</span>, and
          <span class="text-zinc-200 font-medium">AI</span>.<br/>
          Explore chaos, beauty, and the mathematics of nature.
        </p>

        <!-- CTA buttons -->
        <div class="hero-cta mt-10 flex gap-4">
          <a href="/explore" data-link
             class="group relative px-8 py-4 rounded-xl font-medium text-sm text-white overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.98]">
            <span class="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 group-hover:from-blue-500 group-hover:to-violet-500 transition-all"></span>
            <span class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style="box-shadow:0 0 40px rgba(99,102,241,0.5)"></span>
            <span class="relative">Launch Workstation</span>
          </a>
          <a href="/docs" data-link
             class="px-8 py-4 rounded-xl font-medium text-sm text-zinc-300 border border-zinc-700/50 bg-zinc-800/30 backdrop-blur hover:bg-zinc-800/60 hover:border-zinc-600/50 transition-all hover:scale-[1.03] active:scale-[0.98]">
            Documentation
          </a>
        </div>

        <!-- Scroll indicator — positioned at bottom of viewport -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600 animate-bounce-slow">
          <span class="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </div>
      </header>

      <!-- ═══ SIMULATION CARDS ═══ -->
      <section class="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-36">
        <div class="text-center mb-20">
          <h2 class="text-3xl sm:text-4xl font-bold text-zinc-100">Six Dynamical Systems</h2>
          <p class="mt-4 text-zinc-500 max-w-lg mx-auto leading-relaxed">
            From celestial mechanics to fluid dynamics — each simulation is a window into the mathematics of chaos.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${SIMULATIONS.map(
            (sim) => `
            <a href="/physics#${sim.id}" data-link
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
                    Learn the physics
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
      </section>

      <!-- ═══ FEATURES ═══ -->
      <section class="relative z-10 max-w-5xl mx-auto px-6 pb-36">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-zinc-100">Built for Performance</h2>
          <p class="mt-4 text-zinc-500 max-w-lg mx-auto leading-relaxed">
            No compromises. Every layer of the stack is optimised for speed and precision.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          ${FEATURES.map(
            (f) => `
            <div class="feature-card group p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:border-white/[0.1]">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.06] bg-white/[0.03] group-hover:border-white/[0.1] transition-all" style="color:${f.accent}">
                  ${f.icon}
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">${f.title}</h3>
                  <p class="mt-1.5 text-xs text-zinc-500 leading-relaxed">${f.description}</p>
                </div>
              </div>
            </div>
          `
          ).join("")}
        </div>
      </section>

      <!-- ═══ CTA BANNER ═══ -->
      <section class="relative z-10 max-w-4xl mx-auto px-6 pb-36">
        <div class="relative p-12 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-blue-950/30 to-violet-950/30 overflow-hidden text-center">
          <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.1),transparent 60%)"></div>
          <h3 class="relative text-2xl sm:text-3xl font-bold text-zinc-100">Ready to explore?</h3>
          <p class="relative mt-4 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Pick a simulation and start experimenting. Adjust parameters in real-time, chat with AI about the physics, and discover the hidden order within chaos.
          </p>
          <a href="/explore" data-link
             class="relative inline-block mt-8 px-8 py-3.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all hover:scale-[1.03] active:scale-[0.98]"
             style="box-shadow:0 0 30px rgba(99,102,241,0.2)">
            Open Workstation
          </a>
        </div>
      </section>

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

  /* ── Mount starfield ── */
  const scrollRoot = container.querySelector(".home-scroll") as HTMLElement;
  if (scrollRoot) {
    starfield = new Starfield(scrollRoot);
  }

  /* ── Entrance animations ── */
  requestAnimationFrame(() => {
    // Hero elements stagger fade-in
    const heroEls = container.querySelectorAll(
      ".hero-title, .hero-quote, .hero-tagline, .hero-cta"
    );
    heroEls.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = "0";
      htmlEl.style.transform = "translateY(24px)";
      htmlEl.style.transition = `opacity 0.9s ease ${i * 0.18}s, transform 0.9s ease ${i * 0.18}s`;
      requestAnimationFrame(() => {
        htmlEl.style.opacity = "1";
        htmlEl.style.transform = "translateY(0)";
      });
    });

    // Scroll-triggered fade for cards & features
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform =
              "translateY(0) scale(1)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    const animTargets = container.querySelectorAll(
      ".sim-card, .feature-card"
    );
    animTargets.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = "0";
      htmlEl.style.transform = "translateY(30px) scale(0.97)";
      htmlEl.style.transition = `opacity 0.7s ease ${(i % 3) * 0.12}s, transform 0.7s ease ${(i % 3) * 0.12}s`;
      observer.observe(el);
    });

    // Nav background on scroll
    const nav = container.querySelector(".home-nav") as HTMLElement;
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
  });

  /* ── Cleanup ── */
  if ("setCleanup" in _router) {
    (_router as Router & { setCleanup: (fn: () => void) => void }).setCleanup(
      () => {
        starfield?.destroy();
        starfield = null;
      }
    );
  }
}
