import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  plugins: [tailwindcss()],
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "@tauri-apps/plugin-dialog",
        "@tauri-apps/plugin-fs",
        "@tauri-apps/api/core",
        "@tauri-apps/api/event",
      ],
      output: {
        manualChunks: {
          three: ["three"],
          katex: ["katex"],
          hljs: ["highlight.js"],
          marked: ["marked"],
          onnx: ["onnxruntime-web"],
        },
      },
    },
  },
  server: { port: 3000 },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  assetsInclude: ["**/*.onnx", "**/*.wasm"],
});
