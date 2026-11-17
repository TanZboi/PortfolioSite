let root: HTMLElement | null = null;
let hideTimeout: number | undefined;

function ensureRoot(): HTMLElement {
  if (root) return root;
  root = document.createElement("div");
  root.className = "toast";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  document.body.appendChild(root);
  return root;
}

/** Small transient message at the bottom of the screen — e.g. "copied to clipboard" confirmation.
 *  Lives outside any panel's DOM (a lazily-created singleton on <body>) so it survives the panel
 *  that triggered it closing or re-rendering mid-fade. */
export function showToast(message: string, durationMs = 2400): void {
  const el = ensureRoot();
  el.textContent = message;
  el.classList.add("toast--visible");

  window.clearTimeout(hideTimeout);
  hideTimeout = window.setTimeout(() => {
    el.classList.remove("toast--visible");
  }, durationMs);
}
