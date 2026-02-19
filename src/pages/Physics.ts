import type { Router } from "../router";
import { createPageShell } from "../components/PageShell";
import { setupScrollAnimations } from "../components/ScrollAnimator";
import { getPhysicsContent, type PhysicsSection } from "../data/physicsContent";

export function renderPhysics(container: HTMLElement, router: Router): void {
  const { contentArea, scrollRoot } = createPageShell(container, router);

  const sections: PhysicsSection[] = getPhysicsContent();

  contentArea.innerHTML = `
    <div class="max-w-4xl mx-auto px-6">

      <!-- Hero -->
      <div class="text-center mb-12">
        <h1 class="page-title text-5xl sm:text-6xl font-extrabold tracking-tight mb-4">
          Physics &amp; Mathematics
        </h1>
        <p class="text-zinc-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
          The equations, concepts, and beauty behind each simulation.
        </p>
      </div>

      <!-- Tab Bar -->
      <div class="flex flex-wrap justify-center gap-2 mb-12" id="physics-tabs">
        ${sections
          .map(
            (s, i) => `
          <button class="physics-tab ${i === 0 ? "active" : ""}" data-target="${s.id}">
            ${s.title}
          </button>
        `
          )
          .join("")}
      </div>

      <!-- Sections -->
      ${sections
        .map(
          (section) => `
        <div id="${section.id}" class="physics-section mb-16 scroll-mt-24">
          <h2 class="anim-target text-3xl font-bold text-zinc-100 mb-8" style="border-left: 3px solid ${section.accentColor}; padding-left: 0.75rem;">
            ${section.title}
          </h2>

          <div class="space-y-6">
            ${section.subsections
              .map(
                (sub) => `
              <div class="anim-target glass-card p-6 sm:p-8">
                <h3 class="text-lg font-semibold text-zinc-200 mb-4">${sub.heading}</h3>
                <div class="text-sm text-zinc-400 leading-relaxed space-y-3">
                  ${sub.html}
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- Try It button -->
          <div class="mt-6 text-center">
            <a href="/sim/${section.id}" data-link
               class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all hover:scale-[1.03] active:scale-[0.98]"
               style="box-shadow:0 0 20px rgba(99,102,241,0.15)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3l8 5-8 5V3z"/></svg>
              Try ${section.title} in Workstation
            </a>
          </div>
        </div>
      `
        )
        .join("")}

    </div>
  `;

  // Tab click → scroll to section
  const tabs = contentArea.querySelectorAll<HTMLButtonElement>(".physics-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target")!;
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Scrollspy: highlight active tab as user scrolls
  const sectionEls = contentArea.querySelectorAll<HTMLElement>(".physics-section");
  const updateActiveTab = () => {
    const scrollTop = scrollRoot.scrollTop + 200;
    let activeId = sections[0].id;

    sectionEls.forEach((el) => {
      if (el.offsetTop <= scrollTop) {
        activeId = el.id;
      }
    });

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-target") === activeId);
    });
  };

  scrollRoot.addEventListener("scroll", updateActiveTab, { passive: true });

  // Scroll animations
  setupScrollAnimations(scrollRoot, ".anim-target");
}
