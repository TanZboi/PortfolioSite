import { el } from "../../utils/dom";
import { CrtSnakeGame } from "../../game/CrtSnakeGame";
import type { PanelRenderer } from "../PanelController";

export const gamePanel: PanelRenderer = (container) => {
  container.classList.add("panel--controls");

  const scoreEl = el("span", { class: "game-score__value" }, ["0"]);
  const bestEl = el("span", { class: "game-score__value" }, ["0"]);
  const canvas = el("canvas", { class: "crt-screen__canvas" });

  container.append(
    el("header", { class: "panel-header" }, [
      el("div", { class: "panel-header__eyebrow" }, ["> insert cartridge: SNAKE"]),
      el("h2", {}, ["Mini Game"]),
      el("div", { class: "panel-header__subtitle" }, ["Original grid-snake clone — arrow keys or WASD."]),
    ]),
    el("div", { class: "game-score" }, [
      el("div", { class: "game-score__row" }, [el("span", {}, ["SCORE"]), scoreEl]),
      el("div", { class: "game-score__row" }, [el("span", {}, ["BEST"]), bestEl]),
    ]),
    el("div", { class: "crt-screen" }, [
      canvas,
      el("div", { class: "crt-screen__scanlines", "aria-hidden": "true" }),
      el("div", { class: "crt-screen__vignette", "aria-hidden": "true" }),
    ]),
  );

  const game = new CrtSnakeGame({
    canvas,
    onScoreChange: (score, best) => {
      scoreEl.textContent = String(score);
      bestEl.textContent = String(best);
    },
  });
  game.start();
  canvas.tabIndex = 0;
  canvas.focus();

  return () => game.destroy();
};
