"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "HOME", href: "#home" },
  { label: "PROJECTS", href: "#projects" },
  { label: "ABOUT", href: "#about" },
  { label: "CONTACT", href: "#contact" },
];

export default function Navbar() {
  const [active, setActive] = useState("HOME");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id.toUpperCase());
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    const sections = ["home", "projects", "about", "contact"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleNav = (href: string, label: string) => {
    setActive(label);
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#f5f2ed]/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav style={{ marginLeft: "max(48px, 8vw)", marginRight: "max(48px, 8vw)" }} className="pt-10 pb-4 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNav("#home", "HOME")}
          className="text-sm font-mono font-semibold tracking-widest text-neutral-900 hover:opacity-60 transition-opacity"
        >
          KANNAN S
        </button>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.label}>
              <button
                onClick={() => handleNav(link.href, link.label)}
                className={`text-xs font-mono tracking-widest transition-all duration-200 ${
                  active === link.label
                    ? "text-neutral-900 font-bold"
                    : "text-neutral-400 hover:text-neutral-900"
                }`}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-neutral-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#f5f2ed] border-t border-neutral-200 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNav(link.href, link.label)}
              className={`text-left text-xs font-mono tracking-widest transition-all duration-200 ${
                active === link.label
                  ? "text-neutral-900 font-bold"
                  : "text-neutral-400"
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
