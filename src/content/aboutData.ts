export interface ContactLink {
  label: string;
  href: string;
  /** If set, clicking copies this value to the clipboard instead of following `href` — `href` is
   *  kept as a real link too, for right-click "copy link"/opening in a new tab. */
  copyValue?: string;
}

export interface AboutData {
  bio: string[];
  contacts: ContactLink[];
  colophon: string[];
}

/** Contact links are intentionally placeholders — fill in the real handles before deploying. */
export const aboutData: AboutData = {
  bio: [
    "I build real-time 3D graphics — I've just completed a placement year as a 3D developer, and I'm " +
      "now working on my final-year Computer Science + AI project: 3D Gaussian Splatting.",
    "This site is my general portfolio.",
  ],
  contacts: [
    { label: "Email", href: "mailto:billtansey@pm.me", copyValue: "billtansey@pm.me" },
    { label: "GitHub", href: "https://www.github.com/TanZboi" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/bill-tansey-b29340292/" },
  ],
  colophon: [
    "Splat captured with Brush, cleaned and cropped in SuperSplat, rendered live with Spark.",
    "Built with Three.js + TypeScript on Vite (without React or game engine).",
  ],
};
