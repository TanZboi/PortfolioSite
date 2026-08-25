export interface LoadingScreen {
  setProgress: (ratio: number) => void;
  setStatus: (text: string) => void;
  hide: () => void;
  root: HTMLElement;
}

/**
 * Full-screen loading veil shown while the ~6.6MB splat PLY streams in. The Game Boy screen
 * silhouette gives the progress bar somewhere thematic to live instead of a generic spinner.
 */
export function createLoadingScreen(container: HTMLElement): LoadingScreen {
  const root = document.createElement("div");
  root.className = "loading-screen";
  root.innerHTML = `
    <div class="loading-screen__panel">
      <div class="loading-screen__glyph" aria-hidden="true">
        <span class="loading-screen__glyph-dot"></span>
      </div>
      <div class="loading-screen__title">loading splat</div>
      <div class="loading-screen__bar">
        <div class="loading-screen__bar-fill" style="width: 0%"></div>
      </div>
      <div class="loading-screen__status">connecting&hellip;</div>
    </div>
  `;
  container.appendChild(root);

  const fill = root.querySelector<HTMLElement>(".loading-screen__bar-fill")!;
  const status = root.querySelector<HTMLElement>(".loading-screen__status")!;

  const setProgress = (ratio: number) => {
    fill.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
  };

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const hide = () => {
    root.classList.add("loading-screen--done");
    window.setTimeout(() => root.remove(), 700);
  };

  return { setProgress, setStatus, hide, root };
}
