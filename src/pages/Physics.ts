import type { Router } from "../router";

export function renderPhysics(container: HTMLElement, _router: Router): void {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 px-6 py-12">
      <div class="max-w-3xl mx-auto">
        <a href="/" data-link class="text-zinc-500 hover:text-zinc-300 text-sm mb-8 inline-block">&larr; Home</a>
        <h1 class="text-4xl font-bold text-zinc-100 mb-8">Physics Concepts</h1>

        <div class="space-y-10 text-zinc-300">
          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-3">Chaos Theory</h2>
            <p>Deterministic systems can produce unpredictable behavior. Small differences in initial conditions lead to vastly different outcomes — the hallmark of chaos. All six simulations in Gravitation³ exhibit this sensitivity.</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-3">RK4 Integration</h2>
            <p>The Runge-Kutta 4th order method is used throughout for numerical integration. It provides an excellent balance of accuracy and computational cost, with local truncation error of O(h⁵).</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-3">Conservation Laws</h2>
            <p>The three-body simulation conserves total energy and momentum. Energy drift is tracked as a measure of numerical accuracy. The double pendulum conserves total mechanical energy in the absence of damping.</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-3">Strange Attractors</h2>
            <p>The Lorenz and Rossler systems exhibit strange attractors — fractal structures in phase space that trajectories approach but never exactly repeat. These attractors have non-integer dimensions and sensitive dependence on initial conditions.</p>
          </section>

          <section>
            <h2 class="text-2xl font-semibold text-zinc-100 mb-3">Lagrangian Coherent Structures</h2>
            <p>The double gyre simulation reveals LCS — material surfaces that organize fluid transport. These structures explain mixing barriers in ocean circulation and atmospheric dynamics.</p>
          </section>
        </div>
      </div>
    </div>
  `;
}
