"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

export interface RandomLetterSwapProps {
  label: string;
  reverse?: boolean;
  transition?: Transition;
  staggerDuration?: number;
  className?: string;
  onClick?: () => void;
}

export function RandomLetterSwap({
  label,
  reverse = false,
  transition = { duration: 0.6, type: "spring" },
  staggerDuration = 0.025,
  className,
  onClick,
}: RandomLetterSwapProps) {
  const characters = useMemo(() => label.split(""), [label]);
  const [isHovered, setIsHovered] = useState(false);
  const [order, setOrder] = useState<number[]>(() =>
    characters.map((_, i) => i)
  );

  const shuffleOrder = useCallback(() => {
    const indices = characters.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setOrder(indices);
  }, [characters]);

  useEffect(() => {
    shuffleOrder();
  }, [shuffleOrder]);

  const handleMouseEnter = () => {
    shuffleOrder();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const exitYPrimary = reverse ? "100%" : "-100%";
  const initialYSecondary = reverse ? "-100%" : "100%";

  return (
    <span
      className={cn(
        "relative inline-flex items-center overflow-hidden leading-tight select-none",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Screen-reader accessible label */}
      <span className="sr-only">{label}</span>

      {/* Visual animated characters */}
      <span aria-hidden="true" className="inline-flex">
        {characters.map((char, index) => {
          const delay = (order[index] ?? index) * staggerDuration;

          if (char === " ") {
            return (
              <span key={index} className="inline-block whitespace-pre">
                {"\u00A0"}
              </span>
            );
          }

          return (
            <span
              key={index}
              className="relative inline-flex flex-col overflow-hidden"
            >
              <motion.span
                className="inline-block"
                initial={{ y: 0 }}
                animate={{ y: isHovered ? exitYPrimary : 0 }}
                transition={{
                  ...transition,
                  delay: isHovered
                    ? delay
                    : (characters.length - 1 - (order[index] ?? index)) *
                      (staggerDuration * 0.5),
                }}
              >
                {char}
              </motion.span>
              <motion.span
                className="absolute inset-0 inline-block"
                initial={{ y: initialYSecondary }}
                animate={{ y: isHovered ? 0 : initialYSecondary }}
                transition={{
                  ...transition,
                  delay: isHovered
                    ? delay
                    : (characters.length - 1 - (order[index] ?? index)) *
                      (staggerDuration * 0.5),
                }}
              >
                {char}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export default RandomLetterSwap;
