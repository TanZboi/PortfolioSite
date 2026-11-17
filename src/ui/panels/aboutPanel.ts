import { el } from "../../utils/dom";
import { aboutData, type ContactLink } from "../../content/aboutData";
import { showToast } from "../toast";
import type { PanelRenderer } from "../PanelController";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function handleContactClick(contact: ContactLink): ((event: MouseEvent) => void) | undefined {
  if (!contact.copyValue) return undefined;
  const value = contact.copyValue;
  return (event) => {
    event.preventDefault();
    void copyToClipboard(value).then((copied) => {
      showToast(copied ? "Copied email address to your clipboard!" : `Copy failed — email: ${value}`);
    });
  };
}

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
      aboutData.contacts.map((c) => {
        const onClick = handleContactClick(c);
        return el(
          "a",
          {
            href: c.href,
            class: "about-contact",
            target: "_blank",
            rel: "noreferrer noopener",
            ...(onClick ? { onClick } : {}),
          },
          [c.label],
        );
      }),
    ),
    el("div", { class: "about-colophon" }, [
      el("h5", {}, ["Colophon"]),
      ...aboutData.colophon.map((p) => el("p", {}, [p])),
    ]),
  );
};
