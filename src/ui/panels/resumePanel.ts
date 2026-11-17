import { el } from "../../utils/dom";
import { resumeData, type ResumeEntry } from "../../content/resumeData";
import type { PanelRenderer } from "../PanelController";

function entryBlock(entry: ResumeEntry): HTMLElement {
  return el("div", { class: "resume-entry" }, [
    el("div", { class: "resume-entry__head" }, [
      el("h4", {}, [entry.role]),
      el("span", { class: "resume-entry__period" }, [entry.period]),
    ]),
    el("div", { class: "resume-entry__org" }, [entry.org]),
    el(
      "ul",
      {},
      entry.bullets.map((b) => el("li", {}, [b])),
    ),
  ]);
}

export const resumePanel: PanelRenderer = (container) => {
  container.classList.add("panel--screen");

  const skillGroups = Object.entries(resumeData.skills).map(([group, items]) =>
    el("div", { class: "resume-skill-group" }, [
      el("h5", {}, [group]),
      el(
        "div",
        { class: "resume-skill-tags" },
        items.map((item) => el("span", { class: "tag" }, [item])),
      ),
    ]),
  );

  container.append(
    el("header", { class: "panel-header" }, [
      el("div", { class: "panel-header__eyebrow" }, ["> CV.exe"]),
      el("h2", {}, [resumeData.name]),
      el("div", { class: "panel-header__subtitle" }, [resumeData.title]),
    ]),
    el("p", { class: "resume-summary" }, [resumeData.summary]),
    el("section", {}, [el("h3", {}, ["Experience"]), ...resumeData.experience.map(entryBlock)]),
    el("section", {}, [el("h3", {}, ["Education"]), ...resumeData.education.map(entryBlock)]),
    el("section", {}, [el("h3", {}, ["Skills"]), el("div", { class: "resume-skills" }, skillGroups)]),
  );
};
