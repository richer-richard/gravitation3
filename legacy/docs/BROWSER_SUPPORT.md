# Gravitation³ Browser Support

Last updated: November 2025

## Minimum Supported Browsers

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome  | 90+     | Includes Chromium-based Edge/Brave/Arc |
| Edge    | 90+     | Same engine as Chrome |
| Firefox | 88+     | Requires WebGL2 enabled (on by default) |
| Safari  | 15+     | Hardware acceleration must be enabled |

> Tip: Keep "Use hardware acceleration when available" enabled. Disabling it can prevent WebGL contexts from forming, which stops all 3D rendering.

## Required Features

1. **WebGL (GPU accelerated rendering)** – Needed for every 3D simulation  
2. **Web Workers** – Physics integrations run on background threads to keep UI smooth  
3. **WebAssembly** – Used by AI tooling and future CFD solvers  
4. **Pointer Lock + High-resolution timers** – Required for free-look camera controls and performance monitor  
5. **ES2018 JavaScript** – Async/await, modules, and typed arrays are used heavily

## Automatic Detection

The new `shared/browser-support.js` helper runs on every page and performs:

- User agent detection with version checks against the table above  
- Capability sniffing for WebGL, Workers, WebAssembly, and Pointer Lock  
- A non-blocking inline warning banner if requirements are not met  
- An exported `window.GravBrowserSupport` object for future diagnostics

If users dismiss the banner it simply hides for that session; reload to re-run the detection.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Blank canvas, console shows `getContext` errors | WebGL disabled or blocked | Enable hardware acceleration, update GPU drivers |
| Physics panel frozen | Web Workers blocked (strict CSP / extension) | Allow workers for `file://` origins or host via local server |
| AI panel errors about WASM | WebAssembly disabled | Enable `about:config` flags (Firefox) or update Safari |
| Camera controls jumpy on macOS | Pointer lock not granted | Click inside canvas once, or allow pointer lock request |

## Testing Matrix

| Platform | Browser | Result |
|----------|---------|--------|
| macOS 14 (M3) | Safari 17.2 | ✅ |
| macOS 14 (M3) | Chrome 120 | ✅ |
| Windows 11 | Edge 121 | ✅ |
| Windows 11 | Firefox 122 | ✅ |
| Ubuntu 22.04 | Chrome 118 | ✅ |

Older browsers (e.g., Safari 13, Firefox ESR < 88) display the compatibility warning and may not render scenes correctly.

---

Need to update this file? Run the simulators on your target browser/OS combo, append to the testing matrix, and commit with the date of verification.
