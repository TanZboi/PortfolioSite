/**
 * Minimal declarative DOM helper. The project deliberately avoids a framework (see spec), but
 * hand-rolling `document.createElement` calls for every panel gets old fast — this is the
 * smallest thing that fixes that without becoming its own framework.
 */

type Child = Node | string | null | undefined | false;

type AttrValue = string | number | boolean | undefined;

interface ElAttrs {
  class?: string;
  onClick?: (event: MouseEvent) => void;
  [key: string]: AttrValue | ((event: MouseEvent) => void);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: ElAttrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") {
      node.className = String(value);
    } else if (key === "onClick") {
      node.addEventListener("click", value as EventListener);
    } else if (key === "html") {
      node.innerHTML = String(value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }

  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
