export type Project = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  githubLink: string;
  liveLink?: string;
};

export const projects: Project[] = [
  {
    id: "zencode",
    title: "zenCode",
    subtitle: "Real-Time Coding Interview Platform",
    description:
      "Engineered a real-time collaborative workspace with WebRTC peer-to-peer video/audio, a Socket.io-synchronized Monaco Editor, and an isolated Docker-based code execution engine with Redis rate-limiting and sub-second execution. Integrated Google Gemini API for context-aware AI hints and Stripe for subscription billing, deployed via CI/CD to AWS EC2 with Nginx and PM2.",
    tags: ["React", "TypeScript", "Node.js", "MongoDB", "Redis", "Docker", "WebRTC", "Socket.io", "AWS"],
    githubLink: "https://github.com/kannanCodes/zenCode_",
    liveLink: "https://github.com/kannanCodes",
  },
  {
    id: "skillmount",
    title: "SkillMount",
    subtitle: "AI Resume Analysis & Career Intelligence Platform",
    description:
      "Built a modular monolith backend with 7 independent feature modules, integrating Groq AI (Llama 3.3 70B) to analyze resumes and return structured ATS scores, strengths, and improvement suggestions. Implemented skill gap detection, career pivot prediction, and an AI-driven CV tailoring feature with JWT-based role-based access control.",
    tags: ["React", "TypeScript", "Node.js", "MongoDB", "Groq AI", "LLM APIs"],
    githubLink: "https://github.com/kannanCodes/SkillMount",
  },
  {
    id: "chapterless",
    title: "Chapterless",
    subtitle: "E-Commerce Bookstore Platform",
    description:
      "Engineered a full-stack e-commerce platform with inventory-aware ordering, dynamic pricing, and scalable catalog architecture. Built session-based auth with OTP verification and role-based access, integrated Razorpay with server-side signature verification, and designed a complex order/refund system with partial cancellations, returns, and a coupon/referral promotion engine.",
    tags: ["Node.js", "Express.js", "MongoDB", "EJS", "Bootstrap", "Razorpay"],
    githubLink: "https://github.com/kannanCodes/Chapterless",
    liveLink: "https://github.com/kannanCodes",
  },
];
