import { el } from "../../utils/dom";
import { aboutData } from "../../content/aboutData";
import type { PanelRenderer } from "../PanelController";

export const aboutPanel: PanelRenderer = (container) => {
  container.classList.add("panel--back");

  container.append(
    el("header", { class: "panel-header" }, [
      el("div", { class: "panel-header__eyebrow" }, ["> battery cover removed"]),
      el("h2", {}, ["About"]),
    ]),
    el(
      "div",
      { class: "about-bio" },
      aboutData.bio.map((p) => el("p", {}, [p])),
    ),
    el(
      "div",
      { class: "about-contacts" },
      aboutData.contacts.map((c) => el("a", { href: c.href, class: "about-contact", target: "_blank", rel: "noreferrer noopener" }, [c.label])),
    ),
    el("div", { class: "about-colophon" }, [
      el("h5", {}, ["Colophon"]),
      ...aboutData.colophon.map((p) => el("p", {}, [p])),
    ]),
  );
};
