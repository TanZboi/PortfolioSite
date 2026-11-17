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
    title: "Editing 3D scenes by object with Gaussian Splatting",
    tagline: "University honours project",
    description: "My honours project takes a trained 3D Gaussian Splatting scene, a photorealistic reconstruction with no notion of objects, and uses 2D segmentation and learned per-Gaussian features to group it into objects. A custom viewer then lets you select, move, recolour and delete them.",
    tech: ["3DGS", "Python", "PyTorch", "CUDA", "COLMAP", "Semantic Segmentation"],
    link: { label: "View source", href: "https://github.com/TanZboi/HonoursProject" },
    accent: "#b085f5",
  },
  {
    title: "Game Boy Splat Portfolio",
    tagline: "This site",
    description:
      "A real-time 3D Gaussian Splat scan of a Game Boy, rendered in the browser with Three.js and Spark. " +
      "Hand-tuned hitboxes sit on the physical buttons, screen and cartridge. Per-splat effects (a travelling " +
      "pulse wave and an explode) run as GPU shader graphs with no CPU particle system. A playable Snake game " +
      "is projected onto a plane aligned with the real screen, depth-composited against the splats.",
    tech: ["Three.js", "@sparkjsdev/spark", "TypeScript", "Vite", "Gaussian Splatting", "GPU shaders"],
    link: { label: "View source", href: "https://www.github.com/TanZboi/PortfolioSite" },
    accent: "#5eead4",
  },
  {
    title: "Dangerous truck driving",
    tagline: "3D game",
    description: "An in-progress Unity 3D game where you must drive a large truck through horrendous terrain.",
    tech: ["Unity", "3D"],
    accent: "#ffb703",
  },
  {
    title: "JPBot",
    tagline: "Discord music steaming bot",
    description: "A self-hosted C# Discord bot that plays YouTube audio in voice channels. It uses yt-dlp to find the tracks and a Lavalink audio server, which keeps it working through YouTube's bot blocking and Discord's encrypted voice.",
    tech: ["Discord.Net", "Lavalink", "yt-dlp", "Websockets"],
    link: { label: "View source", href: "https://github.com/TanZboi/JPDiscordMusicBot" },
    accent: "#b085f5",
  },
  {
    title: "FL Studio Dracula theme",
    tagline: "Theme pack for FL studio",
    description: "The official dracula theme pack for FL studio.",
    tech: ["Fl Studio", "Dracula"],
    link: { label: "View source", href: "https://draculatheme.com/fl-studio-21" },
    accent: "#b085f5",
  },
];
