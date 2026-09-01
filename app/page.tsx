"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import About from "@/components/About";
import Contact from "@/components/Contact";

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.05 }
    );

    document.querySelectorAll(".section-fade").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />

      {/* Book-margin layout: left-anchored, not centered */}
      <main style={{ marginLeft: "max(48px, 8vw)", marginRight: "max(48px, 8vw)", maxWidth: "1100px" }}>
        <Hero />

        <div className="section-fade">
          <Projects />
        </div>

        <div className="section-fade">
          <About />
        </div>

        <div className="section-fade">
          <Contact />
        </div>
      </main>

      <footer
        style={{
          paddingTop: "40px",
          paddingBottom: "40px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p className="font-mono text-neutral-300" style={{ fontSize: "11px" }}>
          © {new Date().getFullYear()} Kannan S
        </p>
      </footer>
    </>
  );
}
