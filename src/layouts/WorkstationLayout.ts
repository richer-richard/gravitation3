/**
 * WorkstationLayout — main app shell for the simulation workstation.
 * Provides sidebar, canvas area, resizable right panel, and timeline bar.
 */

import type { SimulationType } from "../simulations/types";

export interface WorkstationElements {
  root: HTMLElement;
  sidebar: HTMLElement;
  canvasContainer: HTMLElement;
  rightPanel: HTMLElement;
  tabParams: HTMLElement;
  tabChat: HTMLElement;
  tabMetrics: HTMLElement;
  topBar: HTMLElement;
  timelineBar: HTMLElement;
  perfOverlay: HTMLElement;
}

const SIDEBAR_ITEMS = [
  { id: "three-body", label: "Three Body", icon: "&#9733;" },
  { id: "double-pendulum", label: "Double Pend.", icon: "&#8634;" },
  { id: "lorenz", label: "Lorenz", icon: "&#8734;" },
  { id: "rossler", label: "Rossler", icon: "&#8635;" },
  { id: "double-gyre", label: "Gyre", icon: "&#8776;" },
  { id: "malkus-waterwheel", label: "Malkus", icon: "&#9881;" },
];

export function createWorkstationLayout(
  container: HTMLElement,
  simType: SimulationType,
  simName: string,
  presetName: string
): WorkstationElements {
  const savedSidebar = localStorage.getItem("panel_sidebar") || "200";
  const savedRight = localStorage.getItem("panel_right") || "320";

  container.innerHTML = `
    <div id="workstation" class="h-screen flex flex-col bg-zinc-900 overflow-hidden">
      <!-- Top Bar -->
      <div id="top-bar" class="h-12 bg-zinc-800 border-b border-zinc-700 flex items-center px-4 gap-4 shrink-0">
        <a href="/" data-link class="text-blue-400 font-bold text-sm hover:text-blue-300">G&sup3;</a>
        <span class="text-zinc-300 font-medium">${simName}</span>
        <span class="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded" id="preset-badge">${presetName}</span>
        <div class="flex items-center gap-2 ml-auto" id="top-bar-controls"></div>
      </div>

      <!-- Main Content -->
      <div id="main-content" class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <div id="sidebar" class="bg-zinc-800/80 border-r border-zinc-700 flex flex-col shrink-0 overflow-hidden"
             style="width: ${savedSidebar}px; min-width: 48px;">
          <div class="p-2">
            <button id="btn-collapse" class="w-full text-left px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
              &#9776;
            </button>
          </div>
          <nav class="flex-1 overflow-y-auto px-2 space-y-1">
            ${SIDEBAR_ITEMS.map(
              (item) => `
              <a href="/sim/${item.id}" data-link
                 class="flex items-center gap-2 px-2 py-2 rounded text-sm transition-colors
                        ${item.id === simType ? "bg-blue-600/20 text-blue-400" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"}">
                <span class="text-base w-6 text-center">${item.icon}</span>
                <span class="sidebar-label truncate">${item.label}</span>
              </a>
            `
            ).join("")}
          </nav>
          <div class="p-2 border-t border-zinc-700 space-y-1">
            <a href="/" data-link class="flex items-center gap-2 px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
              <span class="w-6 text-center">&#8962;</span>
              <span class="sidebar-label">Home</span>
            </a>
            <a href="/explore" data-link class="flex items-center gap-2 px-2 py-1 text-zinc-500 hover:text-zinc-300 text-xs">
              <span class="w-6 text-center">&#128269;</span>
              <span class="sidebar-label">Explore</span>
            </a>
          </div>
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
      <div id="timeline-bar" class="h-10 bg-zinc-800 border-t border-zinc-700 flex items-center px-4 gap-3 shrink-0">
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

    <style>
      .tab-btn { color: #71717a; }
      .tab-btn:hover { color: #d4d4d8; }
      .tab-btn.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
    </style>
  `;

  return {
    root: document.getElementById("workstation")!,
    sidebar: document.getElementById("sidebar")!,
    canvasContainer: document.getElementById("canvas-container")!,
    rightPanel: document.getElementById("right-panel")!,
    tabParams: document.getElementById("tab-params")!,
    tabChat: document.getElementById("tab-chat")!,
    tabMetrics: document.getElementById("tab-metrics")!,
    topBar: document.getElementById("top-bar")!,
    timelineBar: document.getElementById("timeline-bar")!,
    perfOverlay: document.getElementById("perf-overlay")!,
  };
}

export function setupTabSwitching(container: HTMLElement): void {
  const tabBtns = container.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabPanels: Record<string, HTMLElement | null> = {
    params: document.getElementById("tab-params"),
    chat: document.getElementById("tab-chat"),
    metrics: document.getElementById("tab-metrics"),
  };

  for (const btn of tabBtns) {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab")!;
      Object.values(tabPanels).forEach((p) => p?.classList.add("hidden"));
      tabPanels[tab]?.classList.remove("hidden");
    });
  }
}

export function setupResizeHandles(): void {
  setupHandle("handle-left", "sidebar", "left", 48, 300);
  setupHandle("handle-right", "right-panel", "right", 280, 500);
}

function setupHandle(
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

export function setupSidebarCollapse(): { cleanup: () => void } {
  const btnCollapse = document.getElementById("btn-collapse");
  const sidebar = document.getElementById("sidebar");
  if (!btnCollapse || !sidebar) return { cleanup: () => {} };

  let collapsed = false;
  const savedWidth = localStorage.getItem("panel_sidebar") || "200";

  const handler = () => {
    collapsed = !collapsed;
    sidebar.style.width = collapsed ? "48px" : `${savedWidth}px`;
    const labels = sidebar.querySelectorAll(".sidebar-label");
    labels.forEach((l) => (l as HTMLElement).classList.toggle("hidden", collapsed));
  };

  btnCollapse.addEventListener("click", handler);
  return { cleanup: () => btnCollapse.removeEventListener("click", handler) };
}
