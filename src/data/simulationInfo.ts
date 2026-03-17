/**
 * Per-simulation contextual info for the workstation sidebar.
 * Provides description, key equations (KaTeX), parameter descriptions,
 * preset descriptions, and a "Learn more" link.
 */

import katex from "katex";

function tex(expr: string): string {
  try {
    return katex.renderToString(expr, { displayMode: false, throwOnError: false });
  } catch {
    return `<span class="math-error">${expr}</span>`;
  }
}

export interface SimulationInfo {
  id: string;
  name: string;
  category: string;
  accentColor: string;
  icon: string;
  description: string;
  equations: { label: string; html: string }[];
  parameters: { name: string; symbol: string; description: string }[];
  presets: Record<string, string>;
}

export function getSimulationInfo(): Record<string, SimulationInfo> {
  return {
    "three-body": {
      id: "three-body",
      name: "Three-Body Problem",
      category: "Gravitational",
      accentColor: "#3b82f6",
      icon: "\u2733",
      description:
        "Three masses interact through Newtonian gravity, producing chaotic or periodic orbits depending on initial conditions.",
      equations: [
        { label: "Gravitational Force", html: tex("F = G\\frac{m_1 m_2}{r^2}") },
        { label: "Acceleration", html: tex("\\ddot{\\vec{r}}_i = G\\sum_{j\\neq i} \\frac{m_j(\\vec{r}_j - \\vec{r}_i)}{|\\vec{r}_j - \\vec{r}_i|^3}") },
      ],
      parameters: [
        { name: "Mass 1", symbol: "m₁", description: "Mass of the first body" },
        { name: "Mass 2", symbol: "m₂", description: "Mass of the second body" },
        { name: "Mass 3", symbol: "m₃", description: "Mass of the third body" },
        { name: "G", symbol: "G", description: "Gravitational constant" },
        { name: "dt", symbol: "Δt", description: "Integration time step" },
      ],
      presets: {
        figure8: "Three equal masses in a periodic figure-eight orbit",
        lagrange: "Equilateral triangle configuration (Lagrange solution)",
        chaotic: "Unpredictable motion with close encounters",
        binary: "Binary pair with a distant third body",
      },
    },
    "double-pendulum": {
      id: "double-pendulum",
      name: "Double Pendulum",
      category: "Mechanical",
      accentColor: "#10b981",
      icon: "\u21BA",
      description:
        "Two linked pendulums exhibit extreme sensitivity to initial conditions — a classic demonstration of chaos.",
      equations: [
        { label: "Lagrangian", html: tex("\\mathcal{L} = T(\\dot{\\theta}_1,\\dot{\\theta}_2) - V(\\theta_1,\\theta_2)") },
      ],
      parameters: [
        { name: "Mass 1", symbol: "m₁", description: "Mass of upper bob" },
        { name: "Mass 2", symbol: "m₂", description: "Mass of lower bob" },
        { name: "Length 1", symbol: "l₁", description: "Length of upper rod" },
        { name: "Length 2", symbol: "l₂", description: "Length of lower rod" },
        { name: "Gravity", symbol: "g", description: "Gravitational acceleration" },
      ],
      presets: {
        standard: "Default starting angles for chaotic motion",
        symmetric: "Symmetric initial conditions",
        highEnergy: "Large initial angles for dramatic motion",
      },
    },
    lorenz: {
      id: "lorenz",
      name: "Lorenz Attractor",
      category: "Strange Attractor",
      accentColor: "#8b5cf6",
      icon: "\u221E",
      description:
        "Edward Lorenz's three equations that launched chaos theory. Trajectories trace a butterfly-shaped strange attractor.",
      equations: [
        { label: "dx/dt", html: tex("\\dot{x} = \\sigma(y-x)") },
        { label: "dy/dt", html: tex("\\dot{y} = x(\\rho-z)-y") },
        { label: "dz/dt", html: tex("\\dot{z} = xy - \\beta z") },
      ],
      parameters: [
        { name: "Sigma", symbol: "σ", description: "Prandtl number (default 10)" },
        { name: "Rho", symbol: "ρ", description: "Rayleigh number (default 28)" },
        { name: "Beta", symbol: "β", description: "Geometric factor (default 8/3)" },
      ],
      presets: {
        classic: "Standard chaotic parameters (σ=10, ρ=28, β=8/3)",
        periodic: "Near-periodic regime",
        transient: "Long transient before settling onto attractor",
      },
    },
    rossler: {
      id: "rossler",
      name: "Rössler Attractor",
      category: "Strange Attractor",
      accentColor: "#ec4899",
      icon: "\u21BB",
      description:
        "The simplest chaotic system — just one nonlinear term produces spiralling, folding trajectories.",
      equations: [
        { label: "dx/dt", html: tex("\\dot{x} = -y - z") },
        { label: "dy/dt", html: tex("\\dot{y} = x + ay") },
        { label: "dz/dt", html: tex("\\dot{z} = b + z(x-c)") },
      ],
      parameters: [
        { name: "a", symbol: "a", description: "Y-feedback strength (default 0.2)" },
        { name: "b", symbol: "b", description: "Z-drift rate (default 0.2)" },
        { name: "c", symbol: "c", description: "Fold threshold (default 5.7)" },
      ],
      presets: {
        classic: "Standard chaotic parameters (a=0.2, b=0.2, c=5.7)",
        periodic: "Period-1 orbit before chaos onset",
        funnel: "Funnel attractor with larger c",
      },
    },
    "double-gyre": {
      id: "double-gyre",
      name: "Double Gyre",
      category: "Fluid Dynamics",
      accentColor: "#0ea5e9",
      icon: "\u2248",
      description:
        "Two counter-rotating ocean circulation cells reveal Lagrangian coherent structures and chaotic mixing.",
      equations: [
        { label: "Stream function", html: tex("\\psi = A\\sin(\\pi f(x,t))\\sin(\\pi y)") },
      ],
      parameters: [
        { name: "Amplitude", symbol: "A", description: "Flow strength" },
        { name: "Epsilon", symbol: "ε", description: "Perturbation strength" },
        { name: "Omega", symbol: "ω", description: "Oscillation frequency" },
      ],
      presets: {
        standard: "Moderate perturbation showing LCS formation",
        steady: "Steady flow (ε=0) with no chaotic mixing",
        strong: "Strong perturbation with rapid mixing",
      },
    },
    "lid-driven-cavity": {
      id: "lid-driven-cavity",
      name: "Lid-Driven Cavity",
      category: "Fluid Dynamics",
      accentColor: "#22d3ee",
      icon: "\u25A3",
      description:
        "A square cavity with a moving top wall creates recirculating vortices, shear layers, and corner eddies — the canonical CFD benchmark for validating incompressible solvers.",
      equations: [
        { label: "Momentum", html: tex("\\frac{\\partial \\vec{u}}{\\partial t} + (\\vec{u}\\cdot\\nabla)\\vec{u} = -\\nabla p + \\nu\\nabla^2 \\vec{u}") },
        { label: "Continuity", html: tex("\\nabla \\cdot \\vec{u} = 0") },
      ],
      parameters: [
        { name: "reynolds", symbol: "Re", description: "Inertial-to-viscous ratio" },
        { name: "lid_velocity", symbol: "U", description: "Velocity of the moving top wall" },
        { name: "viscosity", symbol: "ν", description: "Kinematic viscosity" },
      ],
      presets: {
        standard: "Benchmark cavity with a primary recirculation cell at Re = 400",
        laminar: "Low Reynolds flow with a smooth, stable vortex",
        transition: "Higher Reynolds shear with visible corner eddies",
        "high-shear": "Fast lid and sharp vorticity layers for stress-testing the solver",
      },
    },
    "malkus-waterwheel": {
      id: "malkus-waterwheel",
      name: "Malkus Waterwheel",
      category: "Mechanical",
      accentColor: "#f59e0b",
      icon: "\u2699",
      description:
        "A mechanical analogue of the Lorenz attractor — water dripping into leaky buckets creates chaotic direction reversals.",
      equations: [
        { label: "Angular accel.", html: tex("\\dot{\\omega} = \\sum m_i r\\sin\\theta_i - \\nu\\omega") },
        { label: "Mass change", html: tex("\\dot{m}_i = Q\\delta_{i,\\text{top}} - Km_i") },
      ],
      parameters: [
        { name: "Inflow", symbol: "Q", description: "Water inflow rate" },
        { name: "Leak rate", symbol: "K", description: "Bucket leak rate" },
        { name: "Damping", symbol: "ν", description: "Rotational friction" },
        { name: "Radius", symbol: "R", description: "Wheel radius" },
      ],
      presets: {
        chaotic: "Parameters producing chaotic direction reversals",
        steady: "Steady rotation in one direction",
        periodic: "Regular oscillation regime",
      },
    },
  };
}
