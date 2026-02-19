# Gravitation³

Interactive physics simulation platform featuring six dynamical systems, AI-powered analysis, and ML predictions.

## Simulations

- **Three-Body Problem** — Gravitational N-body dynamics
- **Double Pendulum** — Chaotic Lagrangian mechanics
- **Lorenz Attractor** — The butterfly effect
- **Rossler Attractor** — Spiral chaos
- **Double Gyre** — Oceanic flow patterns
- **Malkus Waterwheel** — Mechanical chaos

## Architecture

- **Frontend**: TypeScript + Three.js + Tailwind CSS (Vite)
- **Physics**: Rust engine compiled to WASM (Web Worker)
- **Server**: Axum (Rust) — LLM proxy, data collection, ML serving
- **Desktop**: Tauri 2.x native macOS app
- **ML**: ONNX Runtime Web for client-side predictions

## Development

```bash
npm install
npm run build:wasm
npm run dev
```

## License

Apache 2.0
