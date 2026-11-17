import { el } from "../utils/dom";

export interface ZoneMenuItem {
  id: string;
  /** e.g. "the screen" — combined into "click the screen". */
  hint: string;
  /** e.g. "Resume" — shown lowercased under the action line. */
  description: string;
}

export interface ZoneMenu {
  root: HTMLElement;
  /** Highlights the item matching `id` (or clears the highlight for `null`) — wired to zone
   *  hover so the menu confirms which real-world spot the user is currently pointing at. */
  setActive: (id: string | null) => void;
}

/**
 * Persistent left-hand-side "how to explore this" menu — a static list of every clickable zone
 * and what it does, since the in-splat hotspots only reveal themselves on hover/the right angle.
 */
export function createZoneMenu(container: HTMLElement, items: ZoneMenuItem[]): ZoneMenu {
  const itemEls = new Map<string, HTMLElement>();

  const listItems = items.map((item) => {
    const itemEl = el("li", { class: "zone-menu__item" }, [
      el("span", { class: "zone-menu__action" }, [`click ${item.hint}`]),
      el("span", { class: "zone-menu__desc" }, [item.description.toLowerCase()]),
    ]);
    itemEls.set(item.id, itemEl);
    return itemEl;
  });

  const root = el("div", { class: "zone-menu" }, [
    el("div", { class: "zone-menu__title" }, ["EXPLORE"]),
    el("ul", { class: "zone-menu__list" }, listItems),
  ]);
  container.appendChild(root);

  const setActive = (id: string | null) => {
    for (const [itemId, itemEl] of itemEls) {
      itemEl.classList.toggle("zone-menu__item--active", itemId === id);
    }
  };

  return { root, setActive };
}
