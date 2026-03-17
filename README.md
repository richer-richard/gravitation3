# Gravitation³

Interactive physics simulation platform featuring chaos and CFD workstations, AI-assisted analysis, and a native Rust engine.

## Simulations

- **Three-Body Problem** — Gravitational N-body dynamics
- **Double Pendulum** — Chaotic Lagrangian mechanics
- **Lorenz Attractor** — The butterfly effect
- **Rossler Attractor** — Spiral chaos
- **Double Gyre** — Oceanic flow patterns
- **Lid-Driven Cavity** — CFD benchmark recirculation cell
- **Malkus Waterwheel** — Mechanical chaos

## Architecture

- **Frontend**: TypeScript + Three.js + Tailwind CSS (Vite)
- **Physics**: Native Rust engine via Tauri IPC
- **Server**: Axum (Rust) — LLM proxy and engine-backed services
- **Desktop**: Tauri 2.x native macOS app
- **AI Providers**: OpenAI, Google, Anthropic, DeepSeek, Moonshot, Qwen, MiniMax

## Development

```bash
npm install
npm run dev
```

## License

Apache 2.0
