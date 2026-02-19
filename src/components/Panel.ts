/**
 * Panel — resizable panel container with drag handle.
 * Used for the sidebar and right panel resizing in the workstation.
 */

export interface PanelOptions {
  side: "left" | "right";
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  storageKey: string;
}

export class Panel {
  private panel: HTMLElement;
  private handle: HTMLElement;
  private options: PanelOptions;
  private startX = 0;
  private startWidth = 0;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor(panel: HTMLElement, handle: HTMLElement, options: PanelOptions) {
    this.panel = panel;
    this.handle = handle;
    this.options = options;
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  init(): void {
    const saved = localStorage.getItem(this.options.storageKey);
    const width = saved ? parseInt(saved, 10) : this.options.defaultWidth;
    this.panel.style.width = `${width}px`;

    this.handle.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      this.handle.classList.add("active");
      this.startX = e.clientX;
      this.startWidth = this.panel.offsetWidth;
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
    });
  }

  private onMouseMove(e: MouseEvent): void {
    const delta = this.options.side === "left"
      ? e.clientX - this.startX
      : this.startX - e.clientX;
    const newWidth = Math.max(
      this.options.minWidth,
      Math.min(this.options.maxWidth, this.startWidth + delta)
    );
    this.panel.style.width = `${newWidth}px`;
  }

  private onMouseUp(): void {
    this.handle.classList.remove("active");
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    localStorage.setItem(
      this.options.storageKey,
      this.panel.style.width.replace("px", "")
    );
  }

  getWidth(): number {
    return this.panel.offsetWidth;
  }

  setWidth(width: number): void {
    this.panel.style.width = `${width}px`;
  }

  destroy(): void {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
  }
}
