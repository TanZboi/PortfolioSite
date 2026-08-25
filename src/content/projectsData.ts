export interface ProjectEntry {
  title: string;
  tagline: string;
  description: string;
  tech: string[];
  link?: { label: string; href: string };
  /** Cartridge label color — purely cosmetic, keeps the shelf from looking monotone. */
  accent: string;
}

/**
 * "Cartridges" shown in the projects panel. The first entry is this site itself — real,
 * specific, and true. The rest are placeholders: swap in actual placement-year / personal
 * projects (titles, tech, links) once you've picked what to show.
 */
export const projectsData: ProjectEntry[] = [
  {
    title: "Game Boy Splat Portfolio",
    tagline: "This site",
    description:
      "A 3D Gaussian Splat scan of a real Game Boy, rendered with Spark's Dyno shader-graph system. " +
      "Click-through interaction zones, angle-gated hotspots, and a custom GPU-driven explode effect " +
      "that offsets every splat by a per-splat pseudo-random vector — no CPU particle system involved.",
    tech: ["Three.js", "@sparkjsdev/spark", "TypeScript", "Vite", "Gaussian Splatting"],
    link: { label: "View source", href: "https://www.github.com/TanZboi/PortfolioSite" },
    accent: "#5eead4",
  },
  {
    title: "other project blah blah this ones yellow",
    tagline: "-",
    description: "description",
    tech: ["wow", "impressive"],
    link: { label: "View", href: "[URL]" },
    accent: "#ffb703",
  },
  {
    title: "another one",
    tagline: "wow",
    description: "adfgsdgsdfgsdfgsr",
    tech: ["drgrdg", "dgrdg"],
    accent: "#b085f5",
  },
];
