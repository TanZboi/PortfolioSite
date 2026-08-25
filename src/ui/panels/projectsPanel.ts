import { el } from "../../utils/dom";
import { projectsData, type ProjectEntry } from "../../content/projectsData";
import type { PanelRenderer } from "../PanelController";

function cartridge(project: ProjectEntry): HTMLElement {
  const link = project.link
    ? el("a", { class: "cartridge__link", href: project.link.href, target: "_blank", rel: "noreferrer noopener" }, [
        `${project.link.label} →`,
      ])
    : null;

  return el("article", { class: "cartridge", style: `--cartridge-accent: ${project.accent}` }, [
    el("div", { class: "cartridge__label" }, [
      el("div", { class: "cartridge__title" }, [project.title]),
      el("div", { class: "cartridge__tagline" }, [project.tagline]),
    ]),
    el("p", { class: "cartridge__description" }, [project.description]),
    el(
      "div",
      { class: "cartridge__tech" },
      project.tech.map((t) => el("span", { class: "tag" }, [t])),
    ),
    link,
  ]);
}

export const projectsPanel: PanelRenderer = (container) => {
  container.classList.add("panel--cartridge");

  container.append(
    el("header", { class: "panel-header" }, [
      el("div", { class: "panel-header__eyebrow" }, ["> insert cartridge"]),
      el("h2", {}, ["Projects"]),
      el("div", { class: "panel-header__subtitle" }, ["Swap one in to see what's on it."]),
    ]),
    el(
      "div",
      { class: "cartridge-shelf" },
      projectsData.map(cartridge),
    ),
  );
};
