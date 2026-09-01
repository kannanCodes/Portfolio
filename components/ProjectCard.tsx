"use client";

import { ArrowUpRight } from "lucide-react";
import { type Project } from "@/data/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      style={{
        paddingTop: "48px",
        paddingBottom: "48px",
      }}
    >
      <div className="flex flex-col md:flex-row md:justify-between" style={{ gap: "24px" }}>
        {/* Content */}
        <div style={{ flex: 1, maxWidth: "640px" }}>
          <h3
            className="font-semibold text-neutral-900"
            style={{ fontSize: "18px", marginBottom: "8px", letterSpacing: "-0.01em" }}
          >
            {project.title}
          </h3>
          <p
            className="font-mono text-neutral-400"
            style={{ fontSize: "11px", letterSpacing: "0.05em", marginBottom: "16px" }}
          >
            {project.subtitle}
          </p>
          <p
            className="text-neutral-500"
            style={{ fontSize: "14px", lineHeight: 1.8, marginBottom: "20px" }}
          >
            {project.description}
          </p>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-neutral-500"
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  border: "1px solid #e5e5e5",
                  borderRadius: "2px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Links */}
        <div
          className="flex items-start"
          style={{ gap: "20px", paddingTop: "4px", flexShrink: 0 }}
        >
          {project.liveLink && (
            <a
              href={project.liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link flex items-center text-neutral-400 hover:text-neutral-900 transition-colors duration-200"
              style={{ gap: "4px", fontSize: "10px", letterSpacing: "0.15em", fontFamily: "monospace", whiteSpace: "nowrap" }}
              aria-label={`View ${project.title} live`}
            >
              LIVE
              <ArrowUpRight size={11} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
            </a>
          )}
          <a
            href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center text-neutral-400 hover:text-neutral-900 transition-colors duration-200"
            style={{ gap: "4px", fontSize: "10px", letterSpacing: "0.15em", fontFamily: "monospace", whiteSpace: "nowrap" }}
            aria-label={`View ${project.title} on GitHub`}
          >
            GITHUB
            <ArrowUpRight size={11} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
          </a>
        </div>
      </div>
    </div>
  );
}
