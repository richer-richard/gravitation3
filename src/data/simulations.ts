/**
 * Shared simulation metadata used by Explore, Physics, and Simulation sidebar.
 * Home.ts keeps its own inline copy and is NOT modified.
 */

export interface SimulationData {
  id: string;
  name: string;
  category: string;
  tagline: string;
  detail: string;
  equation: string;
  gradient: string;
  accentColor: string;
  glow: string;
  previewSvg: string;
  icon: string;
}

export const SIMULATIONS: SimulationData[] = [
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
      "A pendulum attached to another pendulum. Extreme sensitivity to initial conditions turns two simple rods into one of nature\u2019s most mesmerising chaotic systems.",
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
      "Edward Lorenz\u2019s iconic equations that launched chaos theory. Trajectories trace the butterfly-shaped strange attractor, never repeating, never crossing.",
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
      "Otto R\u00f6ssler\u2019s elegant system produces spiralling trajectories with a distinctive fold. Simpler than Lorenz, yet deeply complex \u2014 a gateway to understanding chaotic attractors.",
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
      "Water drips into leaky rotating buckets. This mechanical analogue of the Lorenz attractor produces chaotic direction reversals \u2014 order and chaos from a simple machine.",
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
  {
    id: "lid-driven-cavity",
    name: "Lid-Driven Cavity",
    category: "Fluid Dynamics",
    tagline: "Canonical CFD benchmark for recirculating shear flow",
    detail:
      "A square cavity with a moving top wall generates primary and secondary vortices. Monitor recirculation, vorticity, divergence error, and particle advection in a studio built for computational fluid dynamics.",
    equation: "u\\cdot\\nabla u = -\\nabla p + \\nu\\nabla^2u",
    gradient: "from-cyan-400 to-blue-500",
    accentColor: "#22d3ee",
    glow: "rgba(34,211,238,0.2)",
    previewSvg: `<svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="20" width="120" height="80" rx="10" stroke="rgba(34,211,238,0.3)" stroke-width="1"/>
      <path d="M50 30H150" stroke="rgba(56,189,248,0.8)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M70 70C70 48 92 40 106 53C118 64 112 85 92 88C74 90 62 77 70 70Z" stroke="rgba(34,211,238,0.4)" stroke-width="1.2"/>
      <path d="M126 76C126 67 136 62 144 67C149 71 149 82 139 85C131 86 124 81 126 76Z" stroke="rgba(96,165,250,0.28)" stroke-width="1"/>
      <path d="M54 84C54 77 62 72 69 75C74 78 74 88 67 91C60 93 53 90 54 84Z" stroke="rgba(56,189,248,0.24)" stroke-width="1"/>
      <circle cx="92" cy="88" r="2.5" fill="rgba(34,211,238,0.65)"/>
      <circle cx="139" cy="85" r="2" fill="rgba(96,165,250,0.5)"/>
      <circle cx="67" cy="91" r="2" fill="rgba(56,189,248,0.45)"/>
    </svg>`,
    icon: `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" class="w-8 h-8"><rect x="5" y="5" width="18" height="18" rx="3"/><path d="M8 9h12"/><path d="M11 14c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4Z"/><path d="M9 18c0-1.5 1-3 2.5-3"/></svg>`,
  },
];
