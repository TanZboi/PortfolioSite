import { el } from "../utils/dom";
import type { ZoneId } from "../zones/types";

export type PanelId = ZoneId;

export type PanelRenderer = (container: HTMLElement, close: () => void) => (() => void) | void;

export interface PanelControllerOptions {
  container: HTMLElement;
  renderers: Record<PanelId, PanelRenderer>;
  onOpenChange?: (open: boolean, id: PanelId | null) => void;
}

/**
 * Owns the single content overlay (resume / projects / game / about). Only one panel is ever
 * open at a time — opening a new one tears down the last (calling its cleanup, if any, which
 * matters for the mini-game's animation loop).
 */
export class PanelController {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly renderers: Record<PanelId, PanelRenderer>;
  private readonly onOpenChange: ((open: boolean, id: PanelId | null) => void) | undefined;

  private currentId: PanelId | null = null;
  private currentCleanup: (() => void) | null = null;

  constructor(options: PanelControllerOptions) {
    this.renderers = options.renderers;
    this.onOpenChange = options.onOpenChange;

    const closeButton = el(
      "button",
      { class: "panel-overlay__close", type: "button", "aria-label": "Close panel", onClick: () => this.close() },
      ["×"],
    );
    this.body = el("div", { class: "panel-overlay__body" });
    const card = el("div", { class: "panel-overlay__card", role: "dialog", "aria-modal": "true" }, [
      closeButton,
      this.body,
    ]);
    const backdrop = el("div", { class: "panel-overlay__backdrop", onClick: () => this.close() });

    this.root = el("div", { class: "panel-overlay", "aria-hidden": "true" }, [backdrop, card]);
    options.container.appendChild(this.root);

    window.addEventListener("keydown", this.handleKeydown);
  }

  get isOpen(): boolean {
    return this.currentId !== null;
  }

  open(id: PanelId): void {
    this.currentCleanup?.();
    this.currentCleanup = null;
    this.body.replaceChildren();

    const renderer = this.renderers[id];
    const cleanup = renderer(this.body, () => this.close());
    if (cleanup) this.currentCleanup = cleanup;

    this.currentId = id;
    this.root.classList.add("panel-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    this.onOpenChange?.(true, id);
  }

  close(): void {
    if (!this.currentId) return;
    this.currentId = null;
    this.root.classList.remove("panel-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.currentCleanup?.();
    this.currentCleanup = null;
    this.onOpenChange?.(false, null);
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen) this.close();
  };

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeydown);
    this.currentCleanup?.();
    this.root.remove();
  }
}
