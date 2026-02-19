/**
 * Physics content for all 6 simulations.
 * Ported from legacy/web/physics.html with KaTeX math.
 * Uses katex.renderToString() at render time for synchronous rendering.
 */

import katex from "katex";

function tex(expr: string, displayMode = true): string {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false });
  } catch {
    return `<span class="math-error">${expr}</span>`;
  }
}

export interface PhysicsSection {
  id: string;
  title: string;
  accentColor: string;
  subsections: { heading: string; html: string }[];
}

export function getPhysicsContent(): PhysicsSection[] {
  return [
    {
      id: "three-body",
      title: "Three-Body Problem",
      accentColor: "#3b82f6",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>The <strong>three-body problem</strong> is one of the oldest unsolved problems in physics. Three masses interact through gravity, creating trajectories that are generally impossible to predict with a closed-form solution.</p>
            <p>Isaac Newton solved the two-body problem — two masses orbit in perfect ellipses. But add a third body, and the system becomes chaotic. Henri Poincaré proved in the 1890s that no general analytical solution exists, laying the foundations for chaos theory itself.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-blue-400">Real-World Importance:</strong> Three-body dynamics shape halo orbits, lunar flybys, and low-fuel transfers. The same math keeps missions like JWST parked at the L2 Lagrange point.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>Newton's law of universal gravitation gives the force between any two bodies:</p>
            <div class="math-block">${tex("F = G \\frac{m_1 m_2}{r^2}")}</div>
            <p>For three bodies, each body feels gravitational acceleration from the other two:</p>
            <div class="math-block">${tex("\\frac{d^2\\vec{r}_i}{dt^2} = G \\sum_{j \\neq i} \\frac{m_j (\\vec{r}_j - \\vec{r}_i)}{|\\vec{r}_j - \\vec{r}_i|^3}")}</div>
            <p>This system of coupled ordinary differential equations is integrated numerically using the 4th-order Runge-Kutta method (RK4):</p>
            <div class="math-block">${tex("\\begin{aligned} k_1 &= f(t_n, y_n) \\\\ k_2 &= f\\!\\left(t_n + \\frac{\\Delta t}{2},\\, y_n + \\frac{\\Delta t \\cdot k_1}{2}\\right) \\\\ k_3 &= f\\!\\left(t_n + \\frac{\\Delta t}{2},\\, y_n + \\frac{\\Delta t \\cdot k_2}{2}\\right) \\\\ k_4 &= f(t_n + \\Delta t,\\, y_n + \\Delta t \\cdot k_3) \\\\ y_{n+1} &= y_n + \\frac{\\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4) \\end{aligned}")}</div>
          `,
        },
        {
          heading: "Conservation Laws",
          html: `
            <p>Three conserved quantities serve as accuracy checks for the simulation:</p>
            <p><strong class="text-zinc-200">Total Energy</strong> (kinetic + gravitational potential):</p>
            <div class="math-block">${tex("E = \\frac{1}{2} \\sum_i m_i |\\vec{v}_i|^2 - G \\sum_{i} \\sum_{j>i} \\frac{m_i m_j}{|\\vec{r}_j - \\vec{r}_i|}")}</div>
            <p><strong class="text-zinc-200">Linear Momentum:</strong></p>
            <div class="math-block">${tex("\\vec{P} = \\sum_i m_i \\vec{v}_i")}</div>
            <p><strong class="text-zinc-200">Angular Momentum:</strong></p>
            <div class="math-block">${tex("\\vec{L} = \\sum_i m_i (\\vec{r}_i \\times \\vec{v}_i)")}</div>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-blue-400">Accuracy check:</strong> If energy drifts significantly, it signals that smaller time steps are needed. With RK4 and dt = 0.001, energy drift stays well below 0.01%.</p>
            </div>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Chaos:</strong> Most three-body initial conditions are chaotic — tiny changes in starting positions produce completely different trajectories. This "butterfly effect" makes long-term prediction impossible.</p>
            <p><strong class="text-zinc-200">Famous Configurations:</strong> The <em>figure-eight orbit</em> (Moore 1993, proven by Chenciner & Montgomery 2000) has three equal masses chasing each other along a figure-8. The <em>Lagrange triangle</em> places equal masses at equilateral triangle vertices — this is stable and mirrors Jupiter's Trojan asteroids.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Space mission trajectory planning (gravity assists, halo orbits)</li>
              <li>Multi-star system dynamics in astrophysics</li>
              <li>Satellite constellation stability analysis</li>
              <li>Foundations of chaos theory and nonlinear dynamics</li>
            </ul>
          `,
        },
      ],
    },
    {
      id: "double-pendulum",
      title: "Double Pendulum",
      accentColor: "#10b981",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>A pendulum attached to another pendulum — two simple rods, yet one of the most accessible demonstrations of <strong>chaos theory</strong> you can build at home.</p>
            <p>A single pendulum swings predictably forever. Add just one more link, and the system becomes so chaotic that even knowing the exact starting position won't help you predict its motion beyond a few seconds.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-emerald-400">Simple construction, complex behavior:</strong> The double pendulum demonstrates that complexity doesn't require complicated parts — just complicated interactions.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>We use the <strong>Lagrangian formulation</strong> — kinetic energy minus potential energy:</p>
            <div class="math-block">${tex("\\mathcal{L} = T - V")}</div>
            <p>The system is described by two angles ${tex("\\theta_1", false)} and ${tex("\\theta_2", false)} measured from the vertical. The full Lagrangian for masses ${tex("m_1, m_2", false)} on rods of length ${tex("l_1, l_2", false)} is:</p>
            <div class="math-block">${tex("\\mathcal{L} = \\frac{1}{2}(m_1+m_2)l_1^2\\dot{\\theta}_1^2 + \\frac{1}{2}m_2 l_2^2 \\dot{\\theta}_2^2 + m_2 l_1 l_2 \\dot{\\theta}_1 \\dot{\\theta}_2 \\cos(\\theta_1-\\theta_2) + (m_1+m_2)gl_1\\cos\\theta_1 + m_2 g l_2 \\cos\\theta_2")}</div>
            <p>Applying the Euler-Lagrange equations produces coupled second-order ODEs with terms like ${tex("\\sin(\\theta_1 - \\theta_2)", false)} — the nonlinear coupling that generates chaos.</p>
          `,
        },
        {
          heading: "Parameters",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong class="text-zinc-200">m₁, m₂</strong> — masses of the upper and lower bobs</li>
              <li><strong class="text-zinc-200">l₁, l₂</strong> — lengths of the upper and lower rods</li>
              <li><strong class="text-zinc-200">θ₁, θ₂</strong> — initial angles from vertical (radians)</li>
              <li><strong class="text-zinc-200">g</strong> — gravitational acceleration (default 9.81)</li>
            </ul>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Sensitivity to Initial Conditions:</strong> Release two double pendulums from positions differing by just a millimetre, and within seconds their motions will be completely different.</p>
            <p><strong class="text-zinc-200">Energy Conservation:</strong> Without damping, total mechanical energy (kinetic + potential) is exactly conserved — a powerful accuracy check for the integrator.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Robotics — multi-joint arms face similar chaotic dynamics</li>
              <li>Biomechanics — human limbs are linked pendulums; walking manages this chaos</li>
              <li>Engineering — coupled oscillators in bridges, cranes, and suspension systems</li>
              <li>Fundamental physics — determinism does not imply predictability</li>
            </ul>
          `,
        },
      ],
    },
    {
      id: "lorenz",
      title: "Lorenz Attractor",
      accentColor: "#8b5cf6",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>In 1963, meteorologist <strong>Edward Lorenz</strong> was simulating atmospheric convection when he discovered that rounding inputs from 0.506127 to 0.506 produced completely different weather patterns. This tiny error — less than one part in a thousand — grew exponentially and launched <strong>chaos theory</strong>.</p>
            <p>The <strong>Lorenz attractor</strong> is the butterfly-shaped pattern that emerges from his three simple equations. Trajectories loop around two "wings" in an unpredictable but organised way — never repeating, never crossing, forever bounded.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-violet-400">The Butterfly Effect:</strong> Small changes in starting conditions lead to wildly different outcomes. This is why weather forecasts become unreliable after about a week.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>Three coupled ordinary differential equations describe the system:</p>
            <div class="math-block">${tex("\\begin{aligned} \\frac{dx}{dt} &= \\sigma(y - x) \\\\ \\frac{dy}{dt} &= x(\\rho - z) - y \\\\ \\frac{dz}{dt} &= xy - \\beta z \\end{aligned}")}</div>
            <p>Originally modelling atmospheric convection: <strong>x</strong> = rate of convective flow, <strong>y</strong> = horizontal temperature variation, <strong>z</strong> = vertical temperature variation.</p>
          `,
        },
        {
          heading: "Parameters",
          html: `
            <p>Classic chaotic behaviour emerges with:</p>
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong class="text-zinc-200">σ = 10</strong> (Prandtl number) — relates viscosity to heat diffusion</li>
              <li><strong class="text-zinc-200">ρ = 28</strong> (Rayleigh number) — driving force strength</li>
              <li><strong class="text-zinc-200">β = 8/3</strong> — geometric factor of the region</li>
            </ul>
            <p class="mt-2">Change these parameters and the system transitions between fixed points, periodic orbits, and different types of chaos.</p>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Strange Attractor:</strong> The attractor has fractal dimension ≈ 2.06 — more than a surface, less than a solid. Infinite complexity at every scale.</p>
            <p><strong class="text-zinc-200">Deterministic Chaos:</strong> The equations are deterministic (no randomness), yet practically unpredictable because tiny measurement errors grow exponentially. The Lyapunov exponent ≈ 0.9 means errors roughly double every time unit.</p>
            <p><strong class="text-zinc-200">Aperiodicity:</strong> Trajectories never exactly repeat — they loop around the left wing, switch to the right unpredictably, and continue forever without settling into a pattern.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Weather and climate — fundamental limits on long-term prediction</li>
              <li>Economics — markets exhibit chaotic sensitivity to small changes</li>
              <li>Biology — heart rhythms, brain activity, population dynamics</li>
              <li>Engineering — designing stable control systems that resist chaos</li>
              <li>Philosophy — determinism does not guarantee predictability</li>
            </ul>
          `,
        },
      ],
    },
    {
      id: "rossler",
      title: "Rössler Attractor",
      accentColor: "#ec4899",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>In 1976, biochemist <strong>Otto Rössler</strong> asked: "What is the minimum complexity needed to produce chaos?" While studying chemical oscillations, he designed a system with just <strong>one nonlinear term</strong> — simpler than Lorenz, yet fully chaotic.</p>
            <p>The Rössler attractor looks like a spiral staircase viewed from above. The trajectory spirals outward in loops and periodically "folds" back, creating an ever-varying cinnamon-bun shape in 3D.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-pink-400">Pedagogical value:</strong> Because it is simpler than Lorenz, the Rössler attractor is often used to illustrate the basic mechanisms of chaos without mathematical complexity.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>Three equations with a single nonlinear term ${tex("z(x-c)", false)}:</p>
            <div class="math-block">${tex("\\begin{aligned} \\frac{dx}{dt} &= -y - z \\\\ \\frac{dy}{dt} &= x + ay \\\\ \\frac{dz}{dt} &= b + z(x - c) \\end{aligned}")}</div>
            <p>The first two equations create spiral motion in the xy-plane. The third equation's nonlinear term ${tex("z(x-c)", false)} creates the fold that prevents the spiral from settling into regularity.</p>
          `,
        },
        {
          heading: "Parameters",
          html: `
            <p>Classic chaotic values:</p>
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong class="text-zinc-200">a = 0.2</strong> — feedback in the y-direction; allows gentle spiraling</li>
              <li><strong class="text-zinc-200">b = 0.2</strong> — gentle upward drift in z</li>
              <li><strong class="text-zinc-200">c = 5.7</strong> — threshold for the folding mechanism</li>
            </ul>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Period-Doubling Route to Chaos:</strong> Gradually increasing parameter <em>c</em> produces: fixed point → periodic orbit → period-2 → period-4 → ... → chaos. This universal route appears in dripping faucets, electronic circuits, and population dynamics.</p>
            <p><strong class="text-zinc-200">Stretch and Fold:</strong> Trajectories spiral outward (stretching nearby points apart) then fold back (mixing), creating infinite layered structure — like kneading bread dough.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Chemical oscillations — Rössler's original motivation</li>
              <li>Cardiac arrhythmias — heart rhythms show Rössler-like dynamics</li>
              <li>Neural circuits — spiral-and-fold patterns in brain dynamics</li>
              <li>Electronic circuit design — simple circuits can follow Rössler dynamics</li>
              <li>Teaching tool — clearest example of minimal ingredients for chaos</li>
            </ul>
          `,
        },
      ],
    },
    {
      id: "double-gyre",
      title: "Double Gyre",
      accentColor: "#0ea5e9",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>The <strong>double-gyre flow</strong> models the large-scale circulation of ocean basins: two counter-rotating vortices separated by a jet stream. Think of the North Atlantic — the Gulf Stream system rotates clockwise in the subtropical gyre, while a subpolar gyre rotates counterclockwise.</p>
            <p>When the flow varies in time, the boundary between gyres breaks down and fluid mixes chaotically. Particles trace out beautiful filaments that reveal the hidden architecture of ocean mixing.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-sky-400">Canonical model:</strong> The double gyre is one of the most studied models in geophysical fluid dynamics, revealing how nutrients, pollutants, and heat spread through oceans.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>The flow is defined by a stream function:</p>
            <div class="math-block">${tex("\\psi(x, y, t) = A \\sin(\\pi f(x,t)) \\sin(\\pi y)")}</div>
            <p>where the time-dependent perturbation is:</p>
            <div class="math-block">${tex("f(x,t) = \\epsilon \\sin(\\omega t) x^2 + (1 - 2\\epsilon \\sin(\\omega t))x")}</div>
            <p>Velocity components are derived from the stream function:</p>
            <div class="math-block">${tex("\\begin{aligned} u &= -\\frac{\\partial \\psi}{\\partial y} = -A\\pi \\sin(\\pi f) \\cos(\\pi y) \\\\ v &= \\frac{\\partial \\psi}{\\partial x} = A\\pi \\cos(\\pi f) \\sin(\\pi y) \\frac{\\partial f}{\\partial x} \\end{aligned}")}</div>
          `,
        },
        {
          heading: "Parameters",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong class="text-zinc-200">A</strong> — amplitude of the flow (circulation strength)</li>
              <li><strong class="text-zinc-200">ε (epsilon)</strong> — perturbation strength; ε = 0 gives steady flow, ε > 0 creates chaotic mixing</li>
              <li><strong class="text-zinc-200">ω (omega)</strong> — oscillation frequency of the gyre boundary</li>
            </ul>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Lagrangian Coherent Structures (LCS):</strong> Material surfaces that organize fluid transport. These "invisible barriers" explain why some ocean regions mix rapidly while others stay isolated for months.</p>
            <p><strong class="text-zinc-200">Chaotic Advection:</strong> Even though the flow is simple, particle trajectories become chaotic under time-dependent perturbation. A particle near the gyre boundary gets stretched into a long, thin filament that explores both gyres unpredictably.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Gulf Stream meanders and cross-gyre transport</li>
              <li>Pollutant and oil-spill dispersion modelling</li>
              <li>Nutrient transport and marine ecosystem dynamics</li>
              <li>Climate variability and ocean heat transport</li>
              <li>General theory of mixing in fluid systems</li>
            </ul>
          `,
        },
      ],
    },
    {
      id: "malkus-waterwheel",
      title: "Malkus Waterwheel",
      accentColor: "#f59e0b",
      subsections: [
        {
          heading: "Introduction",
          html: `
            <p>In 1972, physicist <strong>Willem Malkus</strong> designed a waterwheel that is a mechanical analogue of the Lorenz attractor. Water drips steadily into leaky buckets arranged around a wheel rim. The interplay between filling, leaking, friction, and gravity creates chaotic direction reversals.</p>
            <p>The beauty of the Malkus waterwheel is that you can build it in a workshop and <em>see</em> chaos happening — no computers needed, just water, buckets, and gravity producing unpredictable motion.</p>
            <div class="info-callout">
              <p class="text-sm text-zinc-300"><strong class="text-amber-400">Physical insight:</strong> This connection reveals that Lorenz's atmospheric convection and a simple waterwheel share the same mathematical structure. Chaos emerges from identical mechanisms.</p>
            </div>
          `,
        },
        {
          heading: "Governing Equations",
          html: `
            <p>The waterwheel dynamics are described by:</p>
            <div class="math-block">${tex("\\begin{aligned} \\frac{d\\omega}{dt} &= \\sum_{i=1}^{N} m_i r \\sin\\theta_i - \\nu\\omega \\\\ \\frac{dm_i}{dt} &= Q\\delta_{i,\\text{top}} - Km_i \\\\ \\frac{d\\theta_i}{dt} &= \\omega \\end{aligned}")}</div>
            <p>When simplified to a continuous distribution, these reduce to the <strong>Lorenz equations</strong> with:</p>
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm mt-2">
              <li><strong class="text-zinc-200">ω</strong> (angular velocity) ↔ <strong>x</strong> in Lorenz</li>
              <li><strong class="text-zinc-200">First moment of water distribution</strong> ↔ <strong>y</strong></li>
              <li><strong class="text-zinc-200">Second moment</strong> ↔ <strong>z</strong></li>
            </ul>
          `,
        },
        {
          heading: "Parameters",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong class="text-zinc-200">Q</strong> — water inflow rate (maps to Lorenz ρ, the driving force)</li>
              <li><strong class="text-zinc-200">K</strong> — leak rate from each bucket</li>
              <li><strong class="text-zinc-200">ν</strong> — rotational damping / friction (maps to Lorenz σ)</li>
              <li><strong class="text-zinc-200">R</strong> — wheel radius</li>
              <li><strong class="text-zinc-200">I</strong> — moment of inertia</li>
            </ul>
          `,
        },
        {
          heading: "Key Concepts",
          html: `
            <p><strong class="text-zinc-200">Three Regimes:</strong></p>
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li><strong>Steady rotation</strong> — high inflow, low friction: the wheel spins in one direction</li>
              <li><strong>Periodic oscillation</strong> — moderate parameters: regular back-and-forth reversals</li>
              <li><strong>Chaotic rotation</strong> — critical parameters: unpredictable direction changes, exactly mirroring the Lorenz attractor's wing-switching</li>
            </ul>
            <p class="mt-2"><strong class="text-zinc-200">Feedback Loop:</strong> Heavy buckets accelerate rotation → rotation moves buckets to new positions → leaking shifts the weight distribution → instability and chaos.</p>
          `,
        },
        {
          heading: "Applications",
          html: `
            <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-sm">
              <li>Mechanical analogue of atmospheric convection</li>
              <li>Energy extraction in turbines and hydropower (chaotic flow)</li>
              <li>Teaching demonstrations of chaos theory</li>
              <li>Bridge between abstract mathematics and tangible physical systems</li>
            </ul>
          `,
        },
      ],
    },
  ];
}
