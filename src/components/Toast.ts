/**
 * Toast — lightweight notification system with slide-in animation.
 */

type ToastType = "info" | "success" | "warning" | "error";

const COLORS: Record<ToastType, string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
};

const ICONS: Record<ToastType, string> = {
  info: "&#9432;",
  success: "&#10003;",
  warning: "&#9888;",
  error: "&#10007;",
};

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.className = "fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none";
  container.style.maxWidth = "360px";
  document.body.appendChild(container);
  return container;
}

export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 4000
): void {
  const parent = ensureContainer();
  const el = document.createElement("div");
  el.className = `pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm shadow-lg backdrop-blur-sm ${COLORS[type]}`;
  el.style.transform = "translateX(120%)";
  el.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  el.innerHTML = `<span class="text-base">${ICONS[type]}</span><span>${message}</span>`;
  parent.appendChild(el);

  // Slide in
  requestAnimationFrame(() => {
    el.style.transform = "translateX(0)";
  });

  // Auto-dismiss
  const dismiss = () => {
    el.style.transform = "translateX(120%)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  };

  el.addEventListener("click", dismiss);
  setTimeout(dismiss, duration);
}
