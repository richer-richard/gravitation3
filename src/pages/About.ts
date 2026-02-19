import type { Router } from "../router";

export function renderAbout(container: HTMLElement, _router: Router): void {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 px-6 py-12">
      <div class="max-w-3xl mx-auto">
        <a href="/" data-link class="text-zinc-500 hover:text-zinc-300 text-sm mb-8 inline-block">&larr; Home</a>
        <h1 class="text-4xl font-bold text-zinc-100 mb-8">About Gravitation³</h1>

        <div class="prose prose-invert max-w-none space-y-6 text-zinc-300">
          <p>
            Gravitation³ is an interactive physics simulation platform that brings
            chaotic dynamical systems to life in your browser. Built with Rust,
            WebAssembly, and Three.js, it delivers real-time simulations with
            professional-grade performance.
          </p>

          <h2 class="text-2xl font-semibold text-zinc-100 mt-10">Architecture</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li><strong>Physics Engine:</strong> Written in Rust, compiled to WebAssembly for near-native performance</li>
            <li><strong>Visualization:</strong> Three.js with WebGPU/WebGL rendering</li>
            <li><strong>AI Integration:</strong> Multi-provider support (OpenAI, Anthropic, Google, DeepSeek, Moonshot)</li>
            <li><strong>ML Predictions:</strong> ONNX Runtime Web for client-side model inference</li>
            <li><strong>Desktop:</strong> Tauri 2 for native macOS application</li>
          </ul>

          <h2 class="text-2xl font-semibold text-zinc-100 mt-10">License</h2>
          <p>Apache License 2.0</p>
        </div>
      </div>
    </div>
  `;
}
