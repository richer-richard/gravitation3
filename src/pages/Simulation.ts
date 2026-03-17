import type { Router } from "../router";
import { listen } from "@tauri-apps/api/event";
import type { SimulationType } from "../simulations/types";
import { SIMULATION_LIST } from "../simulations/types";
import { SimulationManager } from "../simulations/SimulationManager";
import type { SimulationVisualizer, SpeedMultiplier } from "../simulations/SimulationManager";
import { ParameterPanel } from "../components/ParameterPanel";
import { SystemControlPanel } from "../components/SystemControlPanel";
import { ChatPanel } from "../components/ChatPanel";
import { MetricsPanel } from "../components/MetricsPanel";
import { SimInfoPanel } from "../components/SimInfoPanel";
import { PresetSelector } from "../components/PresetSelector";
import { MODELS } from "../ai/registry";
import { showToast } from "../components/Toast";
import { KeyboardShortcuts } from "../components/KeyboardShortcuts";
import { exportState, takeScreenshot } from "../services/ExportService";
import { IS_TAURI } from "../utils/tauri-bridge";

const SIM_NAMES: Record<string, string> = {
  "three-body": "Three-Body Problem",
  "double-pendulum": "Double Pendulum",
  lorenz: "Lorenz Attractor",
  rossler: "Rossler Attractor",
  "double-gyre": "Double Gyre",
  "lid-driven-cavity": "Lid-Driven Cavity",
  "malkus-waterwheel": "Malkus Waterwheel",
};

const DEFAULT_PRESETS: Record<string, string> = {
  "three-body": "figure8",
  "double-pendulum": "standard",
  lorenz: "classic",
  rossler: "classic",
  "double-gyre": "standard",
  "lid-driven-cavity": "standard",
  "malkus-waterwheel": "chaotic",
};

const PRESETS: Record<string, string[]> = {
  "three-body": ["figure8", "lagrange", "chaotic"],
  "double-pendulum": ["standard", "symmetric", "chaotic", "gentle"],
  lorenz: ["classic", "single", "multicolor", "chaos", "symmetric"],
  rossler: ["classic", "chaotic", "periodic", "funnel"],
  "double-gyre": ["standard", "divergence", "convergence", "chaos"],
  "lid-driven-cavity": ["standard", "laminar", "transition", "high-shear"],
  "malkus-waterwheel": ["chaotic", "periodic", "steady", "reversals"],
};

interface ActionButtonDef {
  label: string;
  handler: (manager: SimulationManager) => void | Promise<void>;
}

function getActionButtons(simType: string, manager: SimulationManager): ActionButtonDef[] {
  const visualizer = manager.getVisualizer() as Record<string, unknown> | null;
  const clearTrails = () => {
    if (visualizer && typeof visualizer.clearTrails === "function") {
      visualizer.clearTrails();
    }
  };

  switch (simType) {
    case "three-body":
    case "double-pendulum":
    case "lorenz":
    case "rossler":
    case "malkus-waterwheel":
      return [{ label: "Clear Trails", handler: clearTrails }];
    case "double-gyre":
      return [
        { label: "Seed 400", handler: (m) => void m.seedParticles(400) },
        {
          label: "Toggle Field",
          handler: () => {
            if (visualizer && typeof visualizer.setShowFlowField === "function") {
              const current = (visualizer as { showFlowField?: boolean }).showFlowField !== false;
              (visualizer as { setShowFlowField: (value: boolean) => void }).setShowFlowField(!current);
            }
          },
        },
      ];
    case "lid-driven-cavity":
      return [
        { label: "Seed 640", handler: (m) => void m.seedParticles(640) },
        { label: "Clear Tracers", handler: clearTrails },
      ];
    default:
      return [];
  }
}

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
    case "lid-driven-cavity": {
      const { LidDrivenCavityVisualizer } = await import("../simulations/lid-driven-cavity/LidDrivenCavityVisualizer");
      return new LidDrivenCavityVisualizer();
    }
    case "malkus-waterwheel": {
      const { MalkusVisualizer } = await import("../simulations/malkus-waterwheel/MalkusVisualizer");
      return new MalkusVisualizer();
    }
  }
}

function extractParams(simType: string, state: unknown): Record<string, number> {
  const s = state as Record<string, unknown>;
  if (!s) return {};

  switch (simType) {
    case "lorenz":
      return { sigma: s.sigma as number, rho: s.rho as number, beta: s.beta as number };
    case "rossler":
      return { a: s.a as number, b: s.b as number, c: s.c as number };
    case "double-gyre":
      return { A: s.a as number, epsilon: s.epsilon as number, omega: s.omega as number };
    case "lid-driven-cavity":
      return {
        reynolds: s.reynolds as number,
        lid_velocity: s.lid_velocity as number,
        viscosity: s.viscosity as number,
      };
    case "malkus-waterwheel":
      return {
        q: s.q as number,
        k: s.k as number,
        nu: s.nu as number,
      };
    default:
      return {};
  }
}

function buildStatusCards(simType: string, state: unknown): string {
  const s = (state as Record<string, unknown>) ?? {};

  if (simType === "three-body") {
    const bodyCount = Array.isArray(s.bodies) ? s.bodies.length : 0;
    const drift = typeof s.energy_drift_pct === "number" ? `${s.energy_drift_pct.toFixed(4)}%` : "—";
    const distance = typeof s.min_distance === "number" ? s.min_distance.toFixed(3) : "—";
    return `
      <div class="studio-status-chip"><span>Bodies</span><strong>${bodyCount}</strong></div>
      <div class="studio-status-chip"><span>Energy drift</span><strong>${drift}</strong></div>
      <div class="studio-status-chip"><span>Min distance</span><strong>${distance}</strong></div>
    `;
  }

  if (simType === "double-pendulum") {
    const pendulums = Array.isArray(s.pendulums) ? s.pendulums.length : 0;
    const energy = typeof s.energy === "number" ? s.energy.toFixed(3) : "—";
    const entropy = typeof s.entropy === "number" ? s.entropy.toFixed(3) : "—";
    return `
      <div class="studio-status-chip"><span>Pendulums</span><strong>${pendulums}</strong></div>
      <div class="studio-status-chip"><span>Energy</span><strong>${energy}</strong></div>
      <div class="studio-status-chip"><span>Entropy</span><strong>${entropy}</strong></div>
    `;
  }

  if (simType === "lid-driven-cavity") {
    const re = typeof s.reynolds === "number" ? s.reynolds.toFixed(0) : "—";
    const divergence = typeof s.divergence_norm === "number" ? s.divergence_norm.toExponential(2) : "—";
    const circulation = typeof s.circulation === "number" ? s.circulation.toFixed(2) : "—";
    return `
      <div class="studio-status-chip"><span>Re</span><strong>${re}</strong></div>
      <div class="studio-status-chip"><span>Divergence</span><strong>${divergence}</strong></div>
      <div class="studio-status-chip"><span>Circulation</span><strong>${circulation}</strong></div>
    `;
  }

  if (simType === "double-gyre") {
    const particles = Array.isArray(s.particles) ? s.particles.length : 0;
    const epsilon = typeof s.epsilon === "number" ? s.epsilon.toFixed(3) : "—";
    const omega = typeof s.omega === "number" ? s.omega.toFixed(3) : "—";
    return `
      <div class="studio-status-chip"><span>Particles</span><strong>${particles}</strong></div>
      <div class="studio-status-chip"><span>Epsilon</span><strong>${epsilon}</strong></div>
      <div class="studio-status-chip"><span>Omega</span><strong>${omega}</strong></div>
    `;
  }

  const time = typeof s.time === "number" ? s.time.toFixed(2) : "—";
  const energy = typeof s.energy === "number" ? s.energy.toFixed(3) : "—";
  const entropy = typeof s.entropy === "number" ? s.entropy.toFixed(3) : "—";

  return `
    <div class="studio-status-chip"><span>Time</span><strong>${time}</strong></div>
    <div class="studio-status-chip"><span>Energy</span><strong>${energy}</strong></div>
    <div class="studio-status-chip"><span>Entropy</span><strong>${entropy}</strong></div>
  `;
}

function formatTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

export async function renderSimulation(
  container: HTMLElement,
  router: Router,
  type: string
): Promise<void> {
  const simType = type as SimulationType;
  const simMeta = SIMULATION_LIST.find((simulation) => simulation.id === simType);

  if (!simMeta) {
    container.innerHTML = `<div class="flex items-center justify-center h-screen text-zinc-400">Unknown simulation: ${type}</div>`;
    return;
  }

  const simName = SIM_NAMES[type] || simMeta.name;
  const savedLeft = localStorage.getItem("studio_left_rail") || "320";
  const savedRight = localStorage.getItem("studio_right_rail") || "380";
  const defaultPreset = DEFAULT_PRESETS[type] || "standard";

  container.innerHTML = `
    <div id="studio-shell" class="studio-shell">
      <header class="studio-topbar">
        <div class="studio-topbar-left">
          <button id="btn-back" class="studio-nav-button" title="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3.5 6 8l4.5 4.5"/></svg>
          </button>
          <a href="/" data-link class="studio-brand">
            <img src="/logo-mark.svg" alt="" class="studio-brand-mark" />
            <span>Gravitation<sup>3</sup></span>
          </a>
          <div class="studio-title-block">
            <p class="studio-kicker">Simulation Studio</p>
            <h1>${simName}</h1>
          </div>
          <span id="preset-badge" class="studio-pill-badge">${defaultPreset}</span>
        </div>
        <div class="studio-topbar-center">
          <div class="studio-transport">
            <button id="btn-play" class="studio-transport-primary">&#9654; Run</button>
            <button id="btn-step" class="studio-transport-button">Step</button>
            <button id="btn-reset" class="studio-transport-button">Reset</button>
          </div>
          <label class="studio-speed">
            <span>Speed</span>
            <select id="speed-select" class="studio-select">
              <option value="0.1">0.1x</option>
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1" selected>1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
            </select>
          </label>
        </div>
        <div class="studio-topbar-right">
          <button id="btn-export" class="studio-transport-button">Export</button>
          <button id="btn-screenshot" class="studio-transport-button">Capture</button>
          <a href="/explore" data-link class="studio-nav-link">Workstations</a>
          <a href="/settings" data-link class="studio-nav-link">Settings</a>
        </div>
      </header>

      <div class="studio-workbench">
        <aside id="left-rail" class="studio-left-rail" style="width:${savedLeft}px; min-width:260px;">
          <div class="studio-scroll-column">
            <section class="studio-section">
              <div class="studio-section-heading">
                <div>
                  <p class="studio-kicker">Session</p>
                  <h2 class="studio-section-title">Preset Browser</h2>
                </div>
              </div>
              <div class="studio-section-copy">Production workstation for ${simName.toLowerCase()}. Select a configuration preset to begin.</div>
              <div id="preset-selector-mount"></div>
              <div id="action-buttons" class="studio-inline-actions"></div>
            </section>
            <div id="sim-info-mount"></div>
          </div>
        </aside>

        <div id="handle-left" class="resize-handle studio-handle"></div>

        <main class="studio-stage-column">
          <section class="studio-stage">
            <div class="studio-stage-header">
              <div id="status-cards" class="studio-status-row"></div>
              <div class="studio-stage-meta">
                <span id="time-readout" class="studio-time-readout">00:00.0</span>
                <span id="perf-overlay" class="studio-fps">FPS --</span>
              </div>
            </div>
            <div id="canvas-container" class="studio-canvas-shell">
              <div id="canvas-loading" class="studio-canvas-loading">Initializing Rust engine...</div>
            </div>
          </section>

          <section class="studio-dock">
            <div class="studio-dock-header">
              <button class="studio-dock-tab active" data-dock-tab="chat">Copilot</button>
              <button class="studio-dock-tab" data-dock-tab="metrics">Metrics</button>
              <div class="studio-dock-spacer"></div>
              <button id="dock-shortcuts" class="studio-icon-button" title="Keyboard shortcuts">?</button>
            </div>
            <div class="studio-dock-body">
              <div id="dock-chat" class="studio-dock-panel"></div>
              <div id="dock-metrics" class="studio-dock-panel hidden"></div>
            </div>
          </section>
        </main>

        <div id="handle-right" class="resize-handle studio-handle"></div>

        <aside id="right-rail" class="studio-right-rail" style="width:${savedRight}px; min-width:320px;">
          <div class="studio-scroll-column">
            <div id="params-mount"></div>
            <div id="system-mount"></div>
          </div>
        </aside>
      </div>
    </div>
  `;

  const canvasContainer = document.getElementById("canvas-container")!;
  const paramsMount = document.getElementById("params-mount")!;
  const systemMount = document.getElementById("system-mount")!;
  const chatMount = document.getElementById("dock-chat")!;
  const metricsMount = document.getElementById("dock-metrics")!;
  const statusCards = document.getElementById("status-cards")!;
  const presetBadge = document.getElementById("preset-badge")!;
  const timeReadout = document.getElementById("time-readout")!;
  const fpsOverlay = document.getElementById("perf-overlay")!;
  const canvasLoading = document.getElementById("canvas-loading");

  const manager = new SimulationManager();
  const simInfoPanel = new SimInfoPanel(document.getElementById("sim-info-mount")!, type);
  simInfoPanel.render();

  const parameterPanel = new ParameterPanel(paramsMount, simType, manager);
  parameterPanel.render();

  const systemPanel = new SystemControlPanel(systemMount, simType, manager);
  systemPanel.render();

  const defaultModel = MODELS.find((model) => model.id === "claude-sonnet-4-6") || MODELS[0];
  const chatPanel = new ChatPanel(chatMount, defaultModel);
  chatPanel.setSimulation(simType);
  chatPanel.setStateGetter(() => manager.getLastState());
  chatPanel.setOnApplyParams((params) => {
    parameterPanel.applyValues(params);
    showToast("Applied inspector values from copilot recommendation", "success");
  });
  chatPanel.render();

  const metricsPanel = new MetricsPanel(metricsMount, simType);
  metricsPanel.render();

  // Preset selector (custom dropdown replacing native select)
  const presetSelectorMount = document.getElementById("preset-selector-mount")!;
  let currentPreset = defaultPreset;
  const presetSelector = new PresetSelector(
    presetSelectorMount,
    simType,
    defaultPreset,
    async (presetId: string) => {
      if (!engineReady) return;
      manager.stop();
      setPlayState();
      currentPreset = presetId;
      const state = await manager.loadPreset(presetId);
      updateUiFromState(state);
      simInfoPanel.updatePreset(presetId);
      presetBadge.textContent = presetId;
    }
  );
  presetSelector.render();
  let unlistenMenu: (() => void) | null = null;
  let engineReady = false;
  let initError: Error | null = null;

  manager.setOnError((error) => {
    showToast(error.message, "error");
  });

  const updateUiFromState = (state: unknown): void => {
    metricsPanel.updateFromState(state);
    systemPanel.updateState(state);
    statusCards.innerHTML = buildStatusCards(simType, state);

    const params = extractParams(type, state);
    if (Object.keys(params).length > 0) {
      simInfoPanel.updateParams(params);
    }

    const record = state as Record<string, unknown>;
    if (typeof record?.time === "number") {
      timeReadout.textContent = formatTime(record.time);
    }
  };

  manager.setOnStateUpdate(updateUiFromState);

  try {
    const visualizer = await loadVisualizer(simType);
    await manager.init(simType, visualizer, canvasContainer);
    const initialState = await manager.loadPreset(defaultPreset);
    updateUiFromState(initialState);
    simInfoPanel.updatePreset(defaultPreset);
    presetBadge.textContent = defaultPreset;
    canvasLoading?.remove();
    engineReady = true;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    statusCards.innerHTML = `
      <div class="studio-status-chip is-error">
        <span>Engine</span>
        <strong>Offline</strong>
      </div>
    `;
    if (canvasLoading) {
      canvasLoading.textContent = `Rust engine failed to initialize: ${initError.message}`;
      canvasLoading.classList.add("is-error");
    }
    showToast(`Failed to initialize ${simName}: ${initError.message}`, "error");
  }

  const btnPlay = document.getElementById("btn-play") as HTMLButtonElement;
  const btnStep = document.getElementById("btn-step") as HTMLButtonElement;
  const btnReset = document.getElementById("btn-reset") as HTMLButtonElement;
  const btnExport = document.getElementById("btn-export") as HTMLButtonElement;
  const btnScreenshot = document.getElementById("btn-screenshot") as HTMLButtonElement;
  const speedSelect = document.getElementById("speed-select") as HTMLSelectElement;
  const requireEngineReady = (): boolean => {
    if (engineReady) {
      return true;
    }
    showToast(
      initError?.message || "Rust engine is not ready in this session.",
      "error"
    );
    return false;
  };

  const setPlayState = (): void => {
    btnPlay.innerHTML = "&#9654; Run";
    btnPlay.classList.remove("is-running");
  };

  const setPauseState = (): void => {
    btnPlay.innerHTML = "&#10074;&#10074; Pause";
    btnPlay.classList.add("is-running");
  };

  if (!engineReady) {
    btnPlay.disabled = true;
    btnStep.disabled = true;
    btnReset.disabled = true;
    btnExport.disabled = true;
    btnScreenshot.disabled = true;
    speedSelect.disabled = true;
  }

  const actionContainer = document.getElementById("action-buttons")!;
  for (const action of getActionButtons(type, manager)) {
    const button = document.createElement("button");
    button.className = "studio-pill-button";
    button.textContent = action.label;
    button.addEventListener("click", async () => {
      if (!requireEngineReady()) {
        return;
      }
      try {
        await action.handler(manager);
      } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), "error");
      }
    });
    actionContainer.appendChild(button);
  }

  btnPlay.addEventListener("click", () => {
    if (!requireEngineReady()) {
      return;
    }
    manager.toggle();
    if (manager.isRunning) setPauseState();
    else setPlayState();
  });

  btnStep.addEventListener("click", () => {
    if (!requireEngineReady()) {
      return;
    }
    if (!manager.isRunning) {
      void manager.stepOnce();
    }
  });

  btnReset.addEventListener("click", async () => {
    if (!requireEngineReady()) {
      return;
    }
    manager.stop();
    setPlayState();
    const preset = presetSelector.getCurrent();
    const state = await manager.loadPreset(preset);
    updateUiFromState(state);
    simInfoPanel.updatePreset(preset);
    presetBadge.textContent = preset;
  });

  speedSelect.addEventListener("change", () => {
    manager.setSpeed(Number(speedSelect.value) as SpeedMultiplier);
  });

  btnExport.addEventListener("click", () => {
    if (!requireEngineReady()) {
      return;
    }
    const state = manager.getLastState();
    if (state) exportState(type, state);
  });

  btnScreenshot.addEventListener("click", () => {
    if (!requireEngineReady()) {
      return;
    }
    const canvas = manager.getCanvas();
    if (canvas) takeScreenshot(canvas);
  });

  document.getElementById("btn-back")!.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void router.navigate("/explore");
    }
  });

  const dockTabs = container.querySelectorAll<HTMLButtonElement>("[data-dock-tab]");
  const dockPanels: Record<string, HTMLElement> = {
    chat: chatMount,
    metrics: metricsMount,
  };

  const activateDockTab = (tab: "chat" | "metrics"): void => {
    dockTabs.forEach((button) => {
      button.classList.toggle("active", button.dataset.dockTab === tab);
    });
    Object.entries(dockPanels).forEach(([name, panel]) => {
      panel.classList.toggle("hidden", name !== tab);
    });
  };

  dockTabs.forEach((button) => {
    button.addEventListener("click", () => {
      activateDockTab(button.dataset.dockTab as "chat" | "metrics");
    });
  });

  const resizeObserver = new ResizeObserver(() => {
    manager.resize();
  });
  resizeObserver.observe(canvasContainer);

  setupResizeHandle("handle-left", "left-rail", "studio_left_rail", 260, 420, false);
  setupResizeHandle("handle-right", "right-rail", "studio_right_rail", 320, 520, true);

  let frameCount = 0;
  let lastFpsTime = performance.now();
  let fpsAnimationId = 0;
  const fpsLoop = (): void => {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime > 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      fpsOverlay.textContent = `FPS ${fps}`;
      frameCount = 0;
      lastFpsTime = now;
    }
    fpsAnimationId = requestAnimationFrame(fpsLoop);
  };
  fpsAnimationId = requestAnimationFrame(fpsLoop);

  const shortcuts = new KeyboardShortcuts();
  shortcuts.register([
    { key: " ", description: "Play / Pause", handler: () => btnPlay.click() },
    { key: ".", description: "Step once", handler: () => btnStep.click() },
    { key: "r", description: "Reset preset", handler: () => btnReset.click() },
    { key: "1", description: "Open copilot dock", handler: () => activateDockTab("chat") },
    { key: "2", description: "Open metrics dock", handler: () => activateDockTab("metrics") },
    {
      key: "e",
      description: "Export current state",
      handler: () => btnExport.click(),
    },
    {
      key: "s",
      modifier: "shift",
      description: "Capture viewport",
      handler: () => btnScreenshot.click(),
    },
  ]);
  shortcuts.attach();

  document.getElementById("dock-shortcuts")?.addEventListener("click", () => shortcuts.toggleHelp());

  if (IS_TAURI) {
    listen<string>("menu-event", (event) => {
      switch (event.payload) {
        case "play_pause":
          btnPlay.click();
          break;
        case "step_forward":
          btnStep.click();
          break;
        case "reset_sim":
          btnReset.click();
          break;
        case "export":
          btnExport.click();
          break;
        case "screenshot":
          btnScreenshot.click();
          break;
        case "shortcuts":
          shortcuts.toggleHelp();
          break;
      }
    })
      .then((unlisten) => {
        unlistenMenu = unlisten;
      })
      .catch(() => undefined);
  }

  router.setCleanup(() => {
    shortcuts.destroy();
    cancelAnimationFrame(fpsAnimationId);
    resizeObserver.disconnect();
    unlistenMenu?.();
    manager.dispose();
    simInfoPanel.destroy();
    parameterPanel.destroy();
    systemPanel.destroy();
    chatPanel.destroy();
    presetSelector.destroy();
    metricsPanel.destroy();
  });
}

function setupResizeHandle(
  handleId: string,
  panelId: string,
  storageKey: string,
  min: number,
  max: number,
  invert: boolean
): void {
  const handle = document.getElementById(handleId);
  const panel = document.getElementById(panelId);
  if (!handle || !panel) return;

  let startX = 0;
  let startWidth = 0;

  const onMouseMove = (event: MouseEvent): void => {
    const delta = invert ? startX - event.clientX : event.clientX - startX;
    const width = Math.max(min, Math.min(max, startWidth + delta));
    panel.style.width = `${width}px`;
  };

  const onMouseUp = (): void => {
    handle.classList.remove("active");
    localStorage.setItem(storageKey, panel.style.width.replace("px", ""));
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  handle.addEventListener("mousedown", (event: MouseEvent) => {
    event.preventDefault();
    handle.classList.add("active");
    startX = event.clientX;
    startWidth = panel.offsetWidth;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
