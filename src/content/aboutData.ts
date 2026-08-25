export interface ContactLink {
  label: string;
  href: string;
}

export interface AboutData {
  bio: string[];
  contacts: ContactLink[];
  colophon: string[];
}

/** Contact links are intentionally placeholders — fill in the real handles before deploying. */
export const aboutData: AboutData = {
  bio: [
    "I build real-time 3D graphics — most recently as a placement-year 3D developer, and next as " +
      "the subject of my final-year Computer Science + AI project: 3D Gaussian Splatting.",
    "This site is my general portfolio.",
  ],
  contacts: [
    { label: "Email", href: "billtansey@pm.me" },
    { label: "GitHub", href: "https://www.github.com/TanZboi" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/bill-tansey-b29340292/" },
  ],
  colophon: [
    "Splat captured with Brush, cleaned and cropped in SuperSplat, rendered live with Spark.",
    "Built with Three.js + TypeScript on Vite, with No React or game engine — direct scene-graph control.",
  ],
};
