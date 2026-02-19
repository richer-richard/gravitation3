/**
 * LandingLayout — layout wrapper for landing/content pages.
 * Provides a centered container with navigation header and footer.
 */

export function createLandingLayout(
  container: HTMLElement,
  content: string
): HTMLElement {
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-900 flex flex-col">
      <nav class="h-14 bg-zinc-800/80 backdrop-blur border-b border-zinc-700/50 flex items-center px-6 shrink-0 sticky top-0 z-50">
        <a href="/" data-link class="text-blue-400 font-bold text-lg hover:text-blue-300 transition-colors">G&sup3;</a>
        <div class="flex items-center gap-6 ml-8">
          <a href="/explore" data-link class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Explore</a>
          <a href="/docs" data-link class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Docs</a>
          <a href="/physics" data-link class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Physics</a>
          <a href="/about" data-link class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">About</a>
        </div>
        <div class="ml-auto">
          <a href="/settings" data-link class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">&#9881; Settings</a>
        </div>
      </nav>

      <main class="flex-1" id="landing-content">
        ${content}
      </main>

      <footer class="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm shrink-0">
        <div class="flex justify-center gap-6 mb-4">
          <a href="/about" data-link class="hover:text-zinc-300 transition-colors">About</a>
          <a href="/physics" data-link class="hover:text-zinc-300 transition-colors">Physics</a>
          <a href="/docs" data-link class="hover:text-zinc-300 transition-colors">Docs</a>
          <a href="/settings" data-link class="hover:text-zinc-300 transition-colors">Settings</a>
        </div>
        <p>Apache 2.0 License</p>
      </footer>
    </div>
  `;

  return document.getElementById("landing-content")!;
}
