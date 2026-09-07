"use client";

import { useEffect, useState } from "react";

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // Show the animation smoothly on initial load, then fade out
    const timer = setTimeout(() => {
      setVisible(false);
      const removeTimer = setTimeout(() => {
        setRemoved(true);
      }, 400); // Wait for fade-out transition to complete
      return () => clearTimeout(removeTimer);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  if (removed) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)] transition-opacity duration-400 ease-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ transitionDuration: "400ms" }}
    >
      <div className="discord" />
    </div>
  );
}
