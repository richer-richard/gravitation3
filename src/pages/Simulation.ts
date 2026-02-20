import type { Router } from "../router";
import type { SimulationType } from "../simulations/types";
import { SIMULATION_LIST } from "../simulations/types";
import { SimulationManager } from "../simulations/SimulationManager";
import type { SimulationVisualizer } from "../simulations/SimulationManager";
import { ParameterPanel } from "../components/ParameterPanel";
import { ChatPanel } from "../components/ChatPanel";
import { MetricsPanel } from "../components/MetricsPanel";
import { SimInfoPanel } from "../components/SimInfoPanel";
import { MODELS } from "../ai/registry";
import { showToast } from "../components/Toast";
import { KeyboardShortcuts } from "../components/KeyboardShortcuts";
import { exportState, takeScreenshot } from "../services/ExportService";

const SIM_NAMES: Record<string, string> = {
  "three-body": "Three-Body Problem",
  "double-pendulum": "Double Pendulum",
  lorenz: "Lorenz Attractor",
  rossler: "Rossler Attractor",
  "double-gyre": "Double Gyre",
  "malkus-waterwheel": "Malkus Waterwheel",
};

const DEFAULT_PRESETS: Record<string, string> = {
  "three-body": "figure8",
  "double-pendulum": "standard",
  lorenz: "classic",
  rossler: "classic",
  "double-gyre": "standard",
  "malkus-waterwheel": "chaotic",
};

async function loadVisualizer(type: SimulationType): Promise<SimulationVisualizer> {
  switch (type) {
    case "three-body": {
      const { ThreeBodyVisualizer } = await import("../simulations/three-body/ThreeBodyVisualizer");
      return new ThreeBodyVisualizer();
    }
    case "double-pendulum": {
      const { DoublePendulumVisualizer } = await import("../simulations/double-pendulum/DoublePendulumVisualizer");
      return new DoublePendulumVisualizer();
    }
    case "lorenz": {
      const { LorenzVisualizer } = await import("../simulations/lorenz/LorenzVisualizer");
      return new LorenzVisualizer();
    }
    case "rossler": {
      const { RosslerVisualizer } = await import("../simulations/rossler/RosslerVisualizer");
      return new RosslerVisualizer();
    }
    case "double-gyre": {
      const { DoubleGyreVisualizer } = await import("../simulations/double-gyre/DoubleGyreVisualizer");
      return new DoubleGyreVisualizer();
    }
    case "malkus-waterwheel": {
      const { MalkusVisualizer } = await import("../simulations/malkus-waterwheel/MalkusVisualizer");
      return new MalkusVisualizer();
    }
  }
}

export async function renderSimulation(
  container: HTMLElement,
  router: Router,
  type: string
): Promise<void> {
  const simType = type as SimulationType;
  const simMeta = SIMULATION_LIST.find((s) => s.id === simType);
  if (!simMeta) {
    container.innerHTML = `<div class="flex items-center justify-center h-screen text-zinc-400">Unknown simulation: ${type}</div>`;
    return;
  }

  const simName = SIM_NAMES[type] || simMeta.name;
  let sidebarCollapsed = false;
  const savedSidebar = localStorage.getItem("panel_sidebar") || "200";
  const savedRight = localStorage.getItem("panel_right") || "320";

  container.innerHTML = `
    <div id="workstation" class="h-screen flex flex-col bg-zinc-900 overflow-hidden">
      <!-- Top Bar -->
      <div class="h-12 bg-zinc-800 border-b border-zinc-700 flex items-center px-4 gap-4 shrink-0">
        <a href="/" data-link class="text-blue-400 font-bold text-sm hover:text-blue-300">G&sup3;</a>
        <span class="text-zinc-300 font-medium">${simName}</span>
        <span class="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded" id="preset-badge">${DEFAULT_PRESETS[type] || ""}</span>
        <div class="flex items-center gap-2 ml-auto">
          <button id="btn-play" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors">
            &#9654; Play
          </button>
          <button id="btn-step" class="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" title="Step forward one frame">
            Step
          </button>
          <button id="btn-reset" class="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors">
            Reset
          </button>
          <select id="speed-select" class="bg-zinc-700 border border-zinc-600 text-zinc-300 text-xs rounded px-2 py-1">
            <option value="0.1">0.1x</option>
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
          </select>
          <a href="/settings" data-link class="text-zinc-500 hover:text-zinc-300 text-sm" title="Settings">&#9881;</a>
        </div>
      </div>

      <!-- Main Content -->
      <div id="main-content" class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <div id="sidebar" class="bg-zinc-800/80 border-r border-zinc-700 flex flex-col shrink-0 overflow-hidden"
             style="width: ${savedSidebar}px; min-width: 48px;">
          <div class="p-2 flex items-center justify-between">
            <button id="btn-collapse" class="px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
              &#9776;
            </button>
          </div>
          <div id="sim-info-mount" class="flex-1 overflow-y-auto sidebar-content"></div>
        </div>

        <!-- Left Resize Handle -->
        <div id="handle-left" class="resize-handle shrink-0"></div>

        <!-- Canvas Area -->
        <div id="canvas-container" class="flex-1 relative bg-zinc-950 min-w-[400px]">
          <div class="absolute inset-0 flex items-center justify-center text-zinc-600" id="canvas-loading">
            Loading simulation...
          </div>
          <div id="perf-overlay" class="absolute top-2 right-2 text-xs font-mono text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded">
            FPS: --
          </div>
        </div>

        <!-- Right Resize Handle -->
        <div id="handle-right" class="resize-handle shrink-0"></div>

        <!-- Right Panel -->
        <div id="right-panel" class="bg-zinc-800/80 border-l border-zinc-700 flex flex-col shrink-0 overflow-hidden"
             style="width: ${savedRight}px; min-width: 280px;">
          <div class="flex border-b border-zinc-700 shrink-0">
            <button class="tab-btn active flex-1 px-3 py-2 text-xs text-center transition-colors" data-tab="params">Parameters</button>
            <button class="tab-btn flex-1 px-3 py-2 text-xs text-center transition-colors" data-tab="chat">AI Chat</button>
            <button class="tab-btn flex-1 px-3 py-2 text-xs text-center transition-colors" data-tab="metrics">Metrics</button>
          </div>
          <div class="flex-1 overflow-hidden flex flex-col">
            <div id="tab-params" class="flex-1 overflow-y-auto"></div>
            <div id="tab-chat" class="hidden flex-1 overflow-hidden"></div>
            <div id="tab-metrics" class="hidden flex-1 overflow-y-auto"></div>
          </div>
        </div>
      </div>

      <!-- Timeline Bar -->
      <div class="h-10 bg-zinc-800 border-t border-zinc-700 flex items-center px-4 gap-3 shrink-0">
        <button id="tl-start" class="text-zinc-500 hover:text-zinc-300 text-xs">|&#9664;</button>
        <button id="tl-play" class="text-zinc-500 hover:text-zinc-300 text-sm">&#9654;</button>
        <button id="tl-end" class="text-zinc-500 hover:text-zinc-300 text-xs">&#9654;|</button>
        <div class="flex-1 mx-4">
          <div class="h-1 bg-zinc-700 rounded-full relative">
            <div id="tl-progress" class="h-1 bg-blue-500 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>
        <span id="tl-time" class="text-xs font-mono text-zinc-500 w-20 text-right">00:00.0</span>
      </div>
    </div>

  `;

  // --- Initialize components ---
  const canvasContainer = document.getElementById("canvas-container")!;
  const tabParams = document.getElementById("tab-params")!;
  const tabChat = document.getElementById("tab-chat")!;
  const tabMetrics = document.getElementById("tab-metrics")!;

  // Load visualizer and init simulation manager
  const manager = new SimulationManager();
  const visualizer = await loadVisualizer(simType);
  await manager.init(simType, visualizer, canvasContainer);

  // Remove loading indicator
  const loadingEl = document.getElementById("canvas-loading");
  if (loadingEl) loadingEl.remove();

  // Load default preset
  const defaultPreset = DEFAULT_PRESETS[type] || "standard";
  await manager.loadPreset(defaultPreset);

  // Initialize sidebar info panel
  const simInfoMount = document.getElementById("sim-info-mount")!;
  const simInfoPanel = new SimInfoPanel(simInfoMount, type);
  simInfoPanel.render();
  simInfoPanel.updatePreset(defaultPreset);

  // Initialize panel components
  const paramPanel = new ParameterPanel(tabParams, simType, manager);
  paramPanel.render();

  const defaultModel = MODELS.find((m) => m.id === "claude-sonnet-4-6") || MODELS[0];
  const chatPanel = new ChatPanel(tabChat, defaultModel);
  chatPanel.setSimulation(simType);
  chatPanel.setStateGetter(() => manager.getLastState());
  chatPanel.setOnApplyParams((params) => {
    paramPanel.applyValues(params);
    showToast("Parameters applied from AI recommendation", "success");
  });
  chatPanel.render();

  const metricsPanel = new MetricsPanel(tabMetrics);
  metricsPanel.render();

  // Wire up error handler
  manager.setOnError((error) => {
    showToast(error.message, "error");
  });

  // Wire up state updates to metrics
  manager.setOnStateUpdate((state) => {
    metricsPanel.updateFromState(state);
    // Update timeline
    const s = state as Record<string, unknown>;
    if (s?.time != null) {
      const time = s.time as number;
      const timeEl = document.getElementById("tl-time");
      if (timeEl) {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        timeEl.textContent = `${String(mins).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;
      }
    }
  });

  // --- Tab switching ---
  const tabBtns = container.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabPanels: Record<string, HTMLElement> = {
    params: tabParams,
    chat: tabChat,
    metrics: tabMetrics,
  };

  for (const btn of tabBtns) {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab")!;
      Object.values(tabPanels).forEach((p) => p.classList.add("hidden"));
      tabPanels[tab]?.classList.remove("hidden");
    });
  }

  // --- Resize handles ---
  setupResizeHandle("handle-left", "sidebar", "left", 48, 300);
  setupResizeHandle("handle-right", "right-panel", "right", 280, 500);

  // --- Play/Pause ---
  const btnPlay = document.getElementById("btn-play")!;
  btnPlay.addEventListener("click", () => {
    manager.toggle();
    btnPlay.innerHTML = manager.isRunning ? "&#9646;&#9646; Pause" : "&#9654; Play";
    btnPlay.className = manager.isRunning
      ? "px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors"
      : "px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors";
  });

  // --- Step ---
  const btnStep = document.getElementById("btn-step")!;
  btnStep.addEventListener("click", () => {
    if (!manager.isRunning) {
      manager.stepOnce();
    }
  });

  // --- Reset ---
  const btnReset = document.getElementById("btn-reset")!;
  btnReset.addEventListener("click", async () => {
    manager.stop();
    await manager.loadPreset(defaultPreset);
    btnPlay.innerHTML = "&#9654; Play";
    btnPlay.className = "px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors";
  });

  // --- Speed ---
  const speedSelect = document.getElementById("speed-select") as HTMLSelectElement;
  speedSelect.addEventListener("change", () => {
    manager.setSpeed(parseFloat(speedSelect.value) as 0.1 | 0.25 | 0.5 | 1 | 2 | 5);
  });

  // --- Sidebar collapse ---
  const btnCollapse = document.getElementById("btn-collapse")!;
  const sidebar = document.getElementById("sidebar")!;
  btnCollapse.addEventListener("click", () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.style.width = sidebarCollapsed ? "48px" : `${savedSidebar}px`;
    const sidebarContent = sidebar.querySelector(".sidebar-content") as HTMLElement;
    if (sidebarContent) {
      sidebarContent.style.display = sidebarCollapsed ? "none" : "";
    }
  });

  // --- Resize observer ---
  const resizeObserver = new ResizeObserver(() => {
    manager.resize();
  });
  resizeObserver.observe(canvasContainer);

  // --- FPS counter ---
  let frameCount = 0;
  let lastFpsTime = performance.now();
  const perfOverlay = document.getElementById("perf-overlay")!;
  const fpsLoop = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime > 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      perfOverlay.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastFpsTime = now;
    }
    requestAnimationFrame(fpsLoop);
  };
  const fpsId = requestAnimationFrame(fpsLoop);

  // --- Keyboard shortcuts ---
  const shortcuts = new KeyboardShortcuts();
  shortcuts.register([
    { key: " ", description: "Play / Pause", handler: () => btnPlay.click() },
    { key: ".", description: "Step forward", handler: () => btnStep.click() },
    { key: "r", description: "Reset simulation", handler: () => btnReset.click() },
    {
      key: "e",
      description: "Export state",
      handler: () => {
        const state = manager.getLastState();
        if (state) exportState(type, state);
      },
    },
    {
      key: "s",
      description: "Screenshot",
      modifier: "shift",
      handler: () => {
        const canvas = manager.getCanvas();
        if (canvas) takeScreenshot(canvas);
      },
    },
    {
      key: "1",
      description: "Parameters tab",
      handler: () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        Object.values(tabPanels).forEach((p) => p.classList.add("hidden"));
        container.querySelector('[data-tab="params"]')?.classList.add("active");
        tabPanels.params?.classList.remove("hidden");
      },
    },
    {
      key: "2",
      description: "AI Chat tab",
      handler: () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        Object.values(tabPanels).forEach((p) => p.classList.add("hidden"));
        container.querySelector('[data-tab="chat"]')?.classList.add("active");
        tabPanels.chat?.classList.remove("hidden");
      },
    },
    {
      key: "3",
      description: "Metrics tab",
      handler: () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        Object.values(tabPanels).forEach((p) => p.classList.add("hidden"));
        container.querySelector('[data-tab="metrics"]')?.classList.add("active");
        tabPanels.metrics?.classList.remove("hidden");
      },
    },
  ]);
  shortcuts.attach();

  // --- Tauri menu events ---
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<string>("menu-event", (event) => {
        switch (event.payload) {
          case "play_pause": btnPlay.click(); break;
          case "step_forward": btnStep.click(); break;
          case "reset_sim": btnReset.click(); break;
          case "export": {
            const state = manager.getLastState();
            if (state) exportState(type, state);
            break;
          }
          case "import": {
            import("../services/ExportService").then(({ importState: doImport }) => {
              doImport().then((data) => {
                if (data) showToast(`Imported ${data.simulationType} state`, "success");
              });
            });
            break;
          }
          case "screenshot": {
            const canvas = manager.getCanvas();
            if (canvas) takeScreenshot(canvas);
            break;
          }
          case "shortcuts": shortcuts.toggleHelp(); break;
        }
      });
    }).catch(() => {});
  }

  // --- Start simulation ---
  manager.start();
  btnPlay.innerHTML = "&#9646;&#9646; Pause";
  btnPlay.className = "px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors";

  // Cleanup on route change
  router.setCleanup(() => {
    shortcuts.destroy();
    cancelAnimationFrame(fpsId);
    resizeObserver.disconnect();
    manager.dispose();
    simInfoPanel.destroy();
    paramPanel.destroy();
    chatPanel.destroy();
    metricsPanel.destroy();
  });
}

function setupResizeHandle(
  handleId: string,
  panelId: string,
  side: "left" | "right",
  min: number,
  max: number
): void {
  const handle = document.getElementById(handleId);
  const panel = document.getElementById(panelId);
  if (!handle || !panel) return;

  let startX = 0;
  let startWidth = 0;

  const onMouseMove = (e: MouseEvent) => {
    const delta = side === "left" ? e.clientX - startX : startX - e.clientX;
    const newWidth = Math.max(min, Math.min(max, startWidth + delta));
    panel.style.width = `${newWidth}px`;
  };

  const onMouseUp = () => {
    handle.classList.remove("active");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    localStorage.setItem(
      `panel_${side === "left" ? "sidebar" : "right"}`,
      panel.style.width.replace("px", "")
    );
  };

  handle.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    handle.classList.add("active");
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
