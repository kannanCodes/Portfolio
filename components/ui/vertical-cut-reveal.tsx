"use client";

import { type Transition, motion, useAnimationControls } from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

export interface VerticalCutRevealProps {
  children: React.ReactNode;
  reverse?: boolean;
  transition?: Transition;
  splitBy?: "words" | "characters" | "lines" | string;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  containerClassName?: string;
  wordLevelClassName?: string;
  elementLevelClassName?: string;
  autoStartDelay?: number; // Delay in ms before initial animation triggers
  enableHover?: boolean;   // Replays the cut reveal on hover
  onClick?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  autoStart?: boolean;
}

export interface VerticalCutRevealRef {
  startAnimation: () => void;
  reset: () => void;
}

interface WordObject {
  characters: string[];
  needsSpace: boolean;
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, VerticalCutRevealProps>(
  (
    {
      children,
      reverse = false,
      transition = {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
      splitBy = "characters",
      staggerDuration = 0.04,
      staggerFrom = "center",
      containerClassName,
      wordLevelClassName,
      elementLevelClassName,
      autoStartDelay = 0,
      enableHover = false,
      onClick,
      onStart,
      onComplete,
      autoStart = true,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const controls = useAnimationControls();
    const isAnimatingRef = useRef(false);

    const text =
      typeof children === "string" ? children : children?.toString() || "";

    const splitIntoCharacters = (str: string): string[] => {
      if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
        return Array.from(segmenter.segment(str), ({ segment }) => segment);
      }
      return Array.from(str);
    };

    const elements = useMemo(() => {
      const words = text.split(" ");
      if (splitBy === "characters") {
        return words.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== words.length - 1,
        }));
      }
      return splitBy === "words"
        ? text.split(" ")
        : splitBy === "lines"
          ? text.split("\n")
          : text.split(splitBy);
    }, [text, splitBy]);

    const totalElementsCount = useMemo(() => {
      if (splitBy === "characters") {
        return (elements as WordObject[]).reduce(
          (acc, word) =>
            acc + (typeof word === "string" ? 1 : word.characters.length),
          0
        );
      }
      return elements.length;
    }, [elements, splitBy]);

    const getStaggerDelay = useCallback(
      (index: number) => {
        const total = totalElementsCount;
        if (staggerFrom === "first") return index * staggerDuration;
        if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
        if (staggerFrom === "center") {
          const center = Math.floor(total / 2);
          return Math.abs(center - index) * staggerDuration;
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * total);
          return Math.abs(randomIndex - index) * staggerDuration;
        }
        return Math.abs((Number(staggerFrom) || 0) - index) * staggerDuration;
      },
      [totalElementsCount, staggerFrom, staggerDuration]
    );

    const startAnimation = useCallback(async () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      onStart?.();

      // Immediately hide behind cut line
      controls.set("hidden");

      // Animate up through the cut
      await controls.start("visible");
      isAnimatingRef.current = false;
      onComplete?.();
    }, [controls, onStart, onComplete]);

    const reset = useCallback(() => {
      controls.set("hidden");
      isAnimatingRef.current = false;
    }, [controls]);

    useImperativeHandle(ref, () => ({
      startAnimation,
      reset,
    }));

    useEffect(() => {
      if (!autoStart) return;

      // Start hidden
      controls.set("hidden");

      const timer = setTimeout(() => {
        startAnimation();
      }, Math.max(0, autoStartDelay));

      return () => clearTimeout(timer);
    }, [autoStart, autoStartDelay, startAnimation, controls]);

    const handleMouseEnter = useCallback(() => {
      if (enableHover) {
        startAnimation();
      }
    }, [enableHover, startAnimation]);

    const variants = {
      hidden: {
        y: reverse ? "-120%" : "120%",
      },
      visible: (i: number) => ({
        y: "0%",
        transition: {
          ...transition,
          delay: ((transition?.delay as number) || 0) + getStaggerDelay(i),
        },
      }),
    };

    return (
      <span
        className={cn(
          "inline-flex flex-wrap whitespace-pre-wrap",
          splitBy === "lines" && "flex-col",
          containerClassName
        )}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        ref={containerRef}
        {...props}
      >
        <span className="sr-only">{text}</span>

        {(splitBy === "characters"
          ? (elements as WordObject[])
          : (elements as string[]).map((el, i) => ({
              characters: [el],
              needsSpace: i !== elements.length - 1,
            }))
        ).map((wordObj, wordIndex, array) => {
          const previousCharsCount = array
            .slice(0, wordIndex)
            .reduce((sum, word) => sum + word.characters.length, 0);

          return (
            <span
              key={wordIndex}
              aria-hidden="true"
              className={cn("inline-flex overflow-hidden", wordLevelClassName)}
            >
              {wordObj.characters.map((char, charIndex) => (
                <span
                  className={cn(
                    "whitespace-pre-wrap relative inline-block overflow-hidden py-1 -my-1",
                    elementLevelClassName
                  )}
                  key={charIndex}
                >
                  <motion.span
                    custom={previousCharsCount + charIndex}
                    initial="hidden"
                    animate={controls}
                    variants={variants}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                </span>
              ))}
              {wordObj.needsSpace && <span>&nbsp;</span>}
            </span>
          );
        })}
      </span>
    );
  }
);

VerticalCutReveal.displayName = "VerticalCutReveal";
export { VerticalCutReveal };
export default VerticalCutReveal;
