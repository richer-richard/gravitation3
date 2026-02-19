/**
 * ScrollAnimator — reusable IntersectionObserver-based fade-in animation.
 * Extracted from Home.ts for use across all content pages.
 */

export function setupScrollAnimations(
  root: HTMLElement,
  selectors: string
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = "1";
          (entry.target as HTMLElement).style.transform =
            "translateY(0) scale(1)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
  );

  const targets = root.querySelectorAll(selectors);
  targets.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = "0";
    htmlEl.style.transform = "translateY(30px) scale(0.97)";
    htmlEl.style.transition = `opacity 0.7s ease ${(i % 4) * 0.1}s, transform 0.7s ease ${(i % 4) * 0.1}s`;
    observer.observe(el);
  });

  return observer;
}
