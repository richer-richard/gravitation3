/** DOM helper utilities */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        element.className = value;
      } else if (key.startsWith("data-")) {
        element.dataset[key.slice(5)] = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

export function qs<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector<T>(selector);
}

export function qsa<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}
