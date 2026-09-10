"use client";

import { useState, useEffect } from "react";
import { Mail, FileText, ArrowUpRight } from "lucide-react";
import PixelMagnet from "@/components/ui/pixel-magnet";
import { PointerHighlight } from "@/components/ui/pointer-highlight";

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

/* ─── Hero ─────────────────────────────────────────────────── */
export default function Hero() {
  // Delay the PointerHighlight until after the KANNAN S. pixel animation finishes.
  // autoPlayDelay=1300ms + ~1500ms animation ≈ 2800ms → give a 3200ms buffer.
  const [showHighlight, setShowHighlight] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHighlight(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="home"
      style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "100px" }}
      className="flex flex-col justify-center"
    >
      <div className="animate-fade-up" style={{ maxWidth: "680px" }}>
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
          autoPlay={true}
          autoPlayDelay={1300}
        >
          KANNAN S.
        </PixelMagnet>

        {showHighlight ? (
          <PointerHighlight
            rectangleClassName="border-neutral-400"
            pointerClassName="text-neutral-600"
          >
            <p className="text-neutral-500 mb-6" style={{ fontSize: "15px", lineHeight: 1.8, maxWidth: "420px" }}>
              I like turning &quot;what if?&quot; into &quot;it works&quot;.
            </p>
          </PointerHighlight>
        ) : (
          <p className="text-neutral-500 mb-6" style={{ fontSize: "15px", lineHeight: 1.8, maxWidth: "420px" }}>
            I like turning &quot;what if?&quot; into &quot;it works&quot;.
          </p>
        )}

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
    </section>
  );
}
