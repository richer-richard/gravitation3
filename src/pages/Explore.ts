import type { Router } from "../router";

const SIMULATIONS = [
  {
    id: "three-body",
    name: "Three-Body Problem",
    description:
      "Three masses interact through gravity, creating unpredictable orbital patterns. Features RK4 integration, collision detection, and multiple preset configurations.",
    category: "Gravitational",
  },
  {
    id: "double-pendulum",
    name: "Double Pendulum",
    description:
      "A pendulum attached to another pendulum exhibits extreme sensitivity to initial conditions. Small changes produce wildly different trajectories.",
    category: "Mechanical",
  },
  {
    id: "lorenz",
    name: "Lorenz Attractor",
    description:
      "Edward Lorenz's famous system of differential equations that gave birth to chaos theory. Watch trajectories trace the butterfly-shaped attractor.",
    category: "Attractor",
  },
  {
    id: "rossler",
    name: "Rossler Attractor",
    description:
      "Otto Rossler's simpler chaotic system produces elegant spiral patterns with a distinctive folding mechanism in phase space.",
    category: "Attractor",
  },
  {
    id: "double-gyre",
    name: "Double Gyre",
    description:
      "Model of oceanic circulation with two counter-rotating flow patterns. Particles reveal Lagrangian coherent structures and chaotic mixing.",
    category: "Fluid",
  },
  {
    id: "malkus-waterwheel",
    name: "Malkus Waterwheel",
    description:
      "A mechanical system analogous to the Lorenz attractor. Water dripping into rotating buckets creates chaotic direction reversals.",
    category: "Mechanical",
  },
];

export function renderExplore(container: HTMLElement, _router: Router): void {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 px-6 py-12">
      <div class="max-w-5xl mx-auto">
        <a href="/" data-link class="text-zinc-500 hover:text-zinc-300 text-sm mb-8 inline-block">&larr; Home</a>
        <h1 class="text-4xl font-bold text-zinc-100 mb-2">Simulations</h1>
        <p class="text-zinc-400 mb-10">Choose a dynamical system to explore.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${SIMULATIONS.map(
            (sim) => `
            <a href="/sim/${sim.id}" data-link
               class="group block p-6 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-blue-500/50 hover:bg-zinc-800 transition-all">
              <span class="inline-block px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-400 mb-3">${sim.category}</span>
              <h3 class="text-xl font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">${sim.name}</h3>
              <p class="mt-2 text-sm text-zinc-400 leading-relaxed">${sim.description}</p>
            </a>
          `
          ).join("")}
        </div>
      </div>
    </div>
  `;
}
