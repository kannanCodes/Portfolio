"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, FileText, ArrowUpRight } from "lucide-react";
import PixelMagnet from "@/components/ui/pixel-magnet";
const GitHubIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LinkedInIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type SocialLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
};

const socialLinks: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/kannanCodes", icon: GitHubIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/kannan-dev/", icon: LinkedInIcon },
  { label: "Email", href: "mailto:hello.kannan.s@gmail.com", icon: Mail },
  { label: "Resume", href: "/resume.pdf", icon: FileText },
];

/* ─── Animated JSON Viewer ─────────────────────────────────── */
/* ─── Animated JSON Viewer ─────────────────────────────────── */

// Each token has text + a CSS color
type Token = { text: string; color: string };

const NEUTRAL  = "#374151"; // punctuation & braces — dark gray
const KEY      = "#090909ff"; // keys — same dark gray
const STR      = "#b81414ff"; // string values — teal
const SPECIAL  = "#0d1cedff"; // booleans/special — purple

const tokens: Token[] = [
  { text: "{",                       color: NEUTRAL },
  { text: "\n  ",                    color: NEUTRAL },
  { text: '"name"',                  color: KEY     },
  { text: ": ",                      color: NEUTRAL },
  { text: '"Kannan S"',              color: STR     },
  { text: ",\n  ",                   color: NEUTRAL },
  { text: '"role"',                  color: KEY     },
  { text: ": ",                      color: NEUTRAL },
  { text: '"MERN Stack Developer"',  color: STR     },
  { text: ",\n  ",                   color: NEUTRAL },
  { text: '"focus"',                 color: KEY     },
  { text: ": [\n    ",               color: NEUTRAL },
  { text: '"Backend Development"',   color: STR     },
  { text: ",\n    ",                 color: NEUTRAL },
  { text: '"Real-time Systems"',     color: STR     },
  { text: ",\n    ",                 color: NEUTRAL },
  { text: '"Cloud & DevOps"',        color: STR     },
  { text: "\n  ],\n  ",              color: NEUTRAL },
  { text: '"currently"',             color: KEY     },
  { text: ": ",                      color: NEUTRAL },
  { text: '"Building & learning"',   color: STR     },
  { text: ",\n  ",                   color: NEUTRAL },
  { text: '"status"',                color: KEY     },
  { text: ": ",                      color: NEUTRAL },
  { text: '"open_to_work"',          color: SPECIAL },
  { text: "\n}",                     color: NEUTRAL },
];

// Flatten tokens into a per-character array with color
const chars: { ch: string; color: string }[] = tokens.flatMap(({ text, color }) =>
  text.split("").map((ch) => ({ ch, color }))
);

function AnimatedJsonViewer() {
  const [typed, setTyped] = useState(0);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Start only when the element enters the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Character-by-character typing once started
  useEffect(() => {
    if (!started || typed >= chars.length) return;
    const ch = chars[typed].ch;
    // Pause longer at newlines; random speed otherwise for human feel
    const delay = ch === "\n" ? 220 : 50 + Math.random() * 50;
    const t = setTimeout(() => setTyped((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [started, typed]);

  // Render: build lines from the chars typed so far
  const renderLines = () => {
    const segments: { ch: string; color: string }[] = chars.slice(0, typed);
    const lines: { ch: string; color: string }[][] = [[]];
    for (const seg of segments) {
      if (seg.ch === "\n") {
        lines.push([]);
      } else {
        lines[lines.length - 1].push(seg);
      }
    }
    return lines;
  };

  const lines = renderLines();
  const done = typed >= chars.length;

  return (
    <div
      ref={containerRef}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "24px 28px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "12.5px",
        lineHeight: "1.85",
        width: "320px",
        flexShrink: 0,
      }}
    >
      {/* macOS traffic-light dots */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e5574b", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f5a623", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#57c555", display: "inline-block" }} />
      </div>

      {/* Code lines */}
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "pre", minHeight: "1.85em" }}>
          {line.map((seg, si) => (
            <span key={si} style={{ color: seg.color }}>{seg.ch}</span>
          ))}
          {/* blinking cursor at end of last line while still typing */}
          {li === lines.length - 1 && !done && (
            <span
              style={{
                display: "inline-block",
                width: "1.5px",
                height: "13px",
                background: "#555",
                marginLeft: "1px",
                verticalAlign: "text-bottom",
                animation: "json-blink 0.8s step-end infinite",
              }}
            />
          )}
        </div>
      ))}

      <style>{`
        @keyframes json-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
export default function Hero() {
  return (
    <section
      id="home"
      style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "100px" }}
      className="flex flex-col justify-center"
    >
      <div
        className="animate-fade-up flex flex-col md:flex-row md:items-center justify-between"
        style={{
          gap: "clamp(28px, 4vw, 56px)",
        }}
      >
        {/* ── Left: name / role / bio / links ─────────────── */}
        <div className="flex-1" style={{ minWidth: 0, maxWidth: "600px" }}>
          <PixelMagnet
            className="mb-5"
            fontSize={72}
            fontWeight={700}
            fontFamily="'Inter', sans-serif"
            pixelSize={4}
            magnetRadius={90}
            magnetStrength={0.3}
            returnSpeed={0.1}
            color="#111111"
          >
            KANNAN S.
          </PixelMagnet>

          <p className="text-neutral-500 mb-6" style={{ fontSize: "15px", lineHeight: 1.8, maxWidth: "420px" }}>
            I like turning &quot;what if?&quot; into &quot;it works&quot;.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", paddingTop: "32px" }}>
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") || href.endsWith(".pdf") ? "_blank" : undefined}
                rel={href.startsWith("http") || href.endsWith(".pdf") ? "noopener noreferrer" : undefined}
                className="group flex items-center text-neutral-500 hover:text-neutral-900 transition-colors duration-200"
                style={{ gap: "6px", fontSize: "11px", letterSpacing: "0.15em", fontFamily: "monospace" }}
                aria-label={label}
              >
                <Icon size={13} />
                <span>{label}</span>
                <ArrowUpRight
                  size={11}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200"
                />
              </a>
            ))}
          </div>
        </div>

        {/* ── Right: animated JSON viewer ──────────────────── */}
        <div className="hidden md:block shrink-0">
          <AnimatedJsonViewer />
        </div>
      </div>
    </section>
  );
}
