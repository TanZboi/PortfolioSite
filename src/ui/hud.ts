export interface Hud {
  root: HTMLElement;
  onExplode: (handler: () => void) => void;
  setExplodeEnabled: (enabled: boolean) => void;
  setHint: (text: string) => void;
}

/**
 * Persistent screen-space chrome: name plate, the explode trigger, and a rotating hint line
 * that nudges first-time visitors toward the interactive zones once they've loaded in.
 */
export function createHud(container: HTMLElement): Hud {
  const root = document.createElement("div");
  root.className = "hud";
  root.innerHTML = `
    <div class="hud__plate">
      <div class="hud__name">BILL TANSEY</div>
      <div class="hud__role">3D/AI Developer</div>
      <div class="hud__meta">21 &middot; United Kingdom</div>
    </div>

    <div class="hud__hint" role="status" aria-live="polite"></div>

    <div class="hud__actions">
      <button type="button" class="hud__explode" aria-label="Explode the Game Boy apart">
        <span class="hud__explode-icon" aria-hidden="true">&#10022;</span>
        <span>EXPLODE</span>
      </button>
    </div>
  `;
  container.appendChild(root);

  const explodeButton = root.querySelector<HTMLButtonElement>(".hud__explode")!;
  const hint = root.querySelector<HTMLElement>(".hud__hint")!;

  const onExplode = (handler: () => void) => {
    explodeButton.addEventListener("click", handler);
  };

  const setExplodeEnabled = (enabled: boolean) => {
    explodeButton.disabled = !enabled;
  };

  const setHint = (text: string) => {
    hint.textContent = text;
  };

  return { root, onExplode, setExplodeEnabled, setHint };
}
