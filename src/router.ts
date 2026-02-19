type RouteHandler = (params: Record<string, string>) => Promise<void> | void;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];
  private container: HTMLElement;
  private currentCleanup: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  on(path: string, handler: RouteHandler): void {
    const keys: string[] = [];
    const pattern = path.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
    this.routes.push({
      pattern: new RegExp(`^${pattern}$`),
      keys,
      handler,
    });
  }

  async navigate(path: string): Promise<void> {
    if (this.currentCleanup) {
      this.currentCleanup();
      this.currentCleanup = null;
    }

    window.history.pushState({}, "", path);
    await this.resolve(path);
  }

  private async resolve(path: string): Promise<void> {
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, i) => {
          params[key] = match[i + 1];
        });
        this.container.innerHTML = "";
        await route.handler(params);
        return;
      }
    }
    // 404 fallback
    this.container.innerHTML = `
      <div class="flex items-center justify-center h-screen">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-zinc-400 mb-4">404</h1>
          <p class="text-zinc-500">Page not found</p>
          <a href="/" class="text-blue-500 hover:text-blue-400 mt-4 inline-block" data-link>Go home</a>
        </div>
      </div>
    `;
  }

  init(): void {
    // Register routes
    this.on("/", () => this.renderHome());
    this.on("/explore", () => this.renderExplore());
    this.on("/sim/:type", (params) => this.renderSimulation(params.type));
    this.on("/about", () => this.renderAbout());
    this.on("/docs", () => this.renderDocs());
    this.on("/physics", () => this.renderPhysics());
    this.on("/settings", () => this.renderSettings());

    // Handle popstate
    window.addEventListener("popstate", () => {
      this.resolve(window.location.pathname);
    });

    // Delegate link clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[data-link]") as HTMLAnchorElement | null;
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute("href")!);
      }
    });

    // Resolve initial route
    this.resolve(window.location.pathname);
  }

  setCleanup(fn: () => void): void {
    this.currentCleanup = fn;
  }

  private renderHome(): void {
    import("./pages/Home").then((m) => m.renderHome(this.container, this));
  }

  private renderExplore(): void {
    import("./pages/Explore").then((m) => m.renderExplore(this.container, this));
  }

  private renderSimulation(type: string): void {
    import("./pages/Simulation").then((m) =>
      m.renderSimulation(this.container, this, type)
    );
  }

  private renderAbout(): void {
    import("./pages/About").then((m) => m.renderAbout(this.container, this));
  }

  private renderDocs(): void {
    import("./pages/Docs").then((m) => m.renderDocs(this.container, this));
  }

  private renderPhysics(): void {
    import("./pages/Physics").then((m) =>
      m.renderPhysics(this.container, this)
    );
  }

  private renderSettings(): void {
    import("./pages/Settings").then((m) =>
      m.renderSettings(this.container, this)
    );
  }
}
