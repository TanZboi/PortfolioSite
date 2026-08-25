/**
 * Resume content. Everything in ALL CAPS square brackets is a placeholder — swap it for the
 * real thing. The placement-year / degree details are filled in from the project brief;
 * dates, company names, and bullet specifics are not, since I don't have them.
 */

export interface ResumeEntry {
  role: string;
  org: string;
  period: string;
  bullets: string[];
}

export interface ResumeData {
  name: string;
  title: string;
  summary: string;
  experience: ResumeEntry[];
  education: ResumeEntry[];
  skills: Record<string, string[]>;
}

export const resumeData: ResumeData = {
  name: "Bill Tansey",
  title: "3D/AI Developer",
  summary:
    "3D developer finishing a placement year building real-time graphics work, now heading into " +
    "final year of a Computer Science + AI degree with an approved final-year project on 3D " +
    "Gaussian Splatting. This site is a live extension of that project: a working Spark/Three.js " +
    "renderer.",
  experience: [
    {
      role: "3D Developer (Placement Year)",
      org: "Wren Kitchens",
      period: "May 2025 – September 2026",
      bullets: [
        "Independently ran my own team, managing my own stream of work.",
        "Took ownership of a program area blah blah",
        "-",
      ],
    },
  ],
  education: [
    {
      role: "BSc Computer Science with Artificial Intelligence",
      org: "University Of Hull",
      period: "September 2023 – June 2027",
      bullets: ["Final-year project: real-time 3D Gaussian Splatting (approved).", "Focused on machine learning and 3D graphics blah blah"],
    },
  ],
  skills: {
    "3D / Graphics": ["Unity", "Three.js", "WebGL", "Gaussian Splatting", "Shader graphs (Spark Dyno)"],
    Languages: ["C#", "Python", "TypeScript"],
    Tooling: ["Git", "Bitbucket", "Unity Cloud", "AWS", "Jenkins"],
  },
};
