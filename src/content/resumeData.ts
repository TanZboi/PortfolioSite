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
        "Sole long-term owner of the 'Improvements' workstream (started as an onboarding task, retained permanently); occasionally directed other developers rotated in during downtime. Delivered 7 new auto-prop categories for Wren's 3D planning software, used daily by 3,000+ designers, saving several minutes per design appointment.",
        "Conducted investigations into 3D Gaussian splatting of virtual scenes in real time 3D and virtual reality, local AI image generation and improvement and AI video frame interpolation.",
      ],
    },
    {
      role: "Climbing instructor",
      org: "Rock Up Ltd",
      period: "Dec 2022 – May 2025",
      bullets: [
        "Managed the climbing area as Arena Lead, delivering safety briefings and supervising climbers to ensure a safe and enjoyable experience for all participants.",
        "Trained and mentored staff, helping to uphold high standards of customer service and operational efficiency.",
      ],
    },
  ],
  education: [
    {
      role: "BSc Computer Science with Artificial Intelligence",
      org: "University Of Hull",
      period: "September 2023 – June 2027",
      bullets: ["Final-year project: real-time 3D Gaussian Splatting (approved - undertaking over the 2026 - 2027 year.)."],
    },
  ],
  skills: {
    "3D / Graphics": ["Unity", "Three.js", "WebGL", "Gaussian Splatting", "Shader graphs (Spark Dyno)"],
    "AI & Machine Learning" : ["Mistral", "Pytorch", "NumPy", "Pandas", "XGBoost / LightGBM", "SciPy"],
    Languages: ["C#", "Python", "TypeScript"],
    Tooling: ["Git", "Bitbucket", "Unity Cloud", "AWS"],
  },
};
