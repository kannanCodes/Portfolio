"use client";

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface PixelMagnetHandle {
  triggerSweep: (duration?: number) => void;
}

interface PixelMagnetProps {
  /** Text content to magnetise */
  children: string;
  /** Font size in px — default 72 */
  fontSize?: number;
  /** Font weight — default 700 */
  fontWeight?: number | string;
  /** Font family — default inherits from body */
  fontFamily?: string;
  /** Pixel grid cell size in px — default 4 */
  pixelSize?: number;
  /** Magnet radius around cursor in px — default 80 */
  magnetRadius?: number;
  /** How strongly pixels snap back (0–1) — default 0.12 */
  returnSpeed?: number;
  /** How strongly the magnet repels (0–1) — default 0.28 */
  magnetStrength?: number;
  /** Pixel colour — default "#111111" */
  color?: string;
  /** Additional class names */
  className?: string;
  /** Whether to play an initial auto sweep animation — default true */
  autoPlay?: boolean;
  /** Delay in ms before initial auto sweep — default 1300 */
  autoPlayDelay?: number;
  /** Interval in ms to re-trigger idle sweep if user hasn't touched — default 9000 */
  idleInterval?: number;
}

interface Pixel {
  /** Original resting x */
  ox: number;
  /** Original resting y */
  oy: number;
  /** Current x */
  x: number;
  /** Current y */
  y: number;
  /** Current velocity x */
  vx: number;
  /** Current velocity y */
  vy: number;
}

const PixelMagnet = forwardRef<PixelMagnetHandle, PixelMagnetProps>(
  function PixelMagnet(
    {
      children,
      fontSize = 72,
      fontWeight = 700,
      fontFamily,
      pixelSize = 4,
      magnetRadius = 80,
      returnSpeed = 0.12,
      magnetStrength = 0.28,
      color = "#111111",
      className = "",
      autoPlay = true,
      autoPlayDelay = 1300,
      idleInterval = 9000,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textRef = useRef<HTMLHeadingElement>(null);
    const pixelsRef = useRef<Pixel[]>([]);
    const mouseRef = useRef({ x: -9999, y: -9999, active: false });
    const rafRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const userInteractedRef = useRef(false);
    const autoAnimRef = useRef<{
      running: boolean;
      startTime: number;
      duration: number;
    }>({ running: false, startTime: 0, duration: 1200 });

    /** Trigger a virtual magnetic wave across the text */
    const triggerAutoSweep = useCallback((duration = 1200) => {
      autoAnimRef.current = {
        running: true,
        startTime: performance.now(),
        duration,
      };
    }, []);

    useImperativeHandle(ref, () => ({
      triggerSweep: (duration = 1200) => {
        triggerAutoSweep(duration);
      },
    }));

    /** Rasterise the text onto an off-screen canvas, sample every pixelSize px */
    const buildPixels = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (w <= 0 || h <= 0) return;

      const sw = Math.round(w * dpr);
      const sh = Math.round(h * dpr);
      if (sw <= 0 || sh <= 0) return;

      canvas.width = sw;
      canvas.height = sh;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Draw text to sample pixel positions
      const resolvedFont =
        fontFamily ||
        getComputedStyle(document.body).fontFamily ||
        "'Inter', sans-serif";

      // Auto-scale font size on narrow mobile screens so it fits naturally
      let drawSize = fontSize;
      ctx.font = `${fontWeight} ${drawSize}px ${resolvedFont}`;
      const metrics = ctx.measureText(children);
      if (metrics.width > w && w > 0) {
        drawSize = Math.max(
          28,
          Math.floor(drawSize * (w / metrics.width) * 0.96)
        );
        ctx.font = `${fontWeight} ${drawSize}px ${resolvedFont}`;
      }

      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const textX = 0;
      const textY = h / 2;
      ctx.fillText(children, textX, textY);

      // Sample pixel data safely
      const imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      const pixels: Pixel[] = [];

      for (let py = 0; py < h; py += pixelSize) {
        for (let px = 0; px < w; px += pixelSize) {
          const ix = Math.min(Math.round(px * dpr), sw - 1);
          const iy = Math.min(Math.round(py * dpr), sh - 1);
          const idx = (iy * sw + ix) * 4;
          if (data[idx + 3] > 128) {
            pixels.push({ ox: px, oy: py, x: px, y: py, vx: 0, vy: 0 });
          }
        }
      }

      ctx.clearRect(0, 0, w, h);
      pixelsRef.current = pixels;

      // Smoothly swap from initial fallback text to canvas particles without React re-render
      if (pixels.length > 0) {
        if (textRef.current) textRef.current.style.opacity = "0";
        if (canvasRef.current) canvasRef.current.style.opacity = "1";
      } else {
        if (textRef.current) textRef.current.style.opacity = "1";
        if (canvasRef.current) canvasRef.current.style.opacity = "0";
      }
    }, [children, fontSize, fontWeight, fontFamily, pixelSize, color]);

    /** Animation loop */
    const animate = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      const { x: mx, y: my, active: mouseActive } = mouseRef.current;

      let effActive = mouseActive;
      let effX = mx;
      let effY = my;
      let effRadius = magnetRadius;
      let effStrength = magnetStrength;

      // Auto sweep virtual point animation
      const now = performance.now();
      if (!mouseActive && autoAnimRef.current.running) {
        const elapsed = now - autoAnimRef.current.startTime;
        if (elapsed >= 0 && elapsed <= autoAnimRef.current.duration) {
          const progress = elapsed / autoAnimRef.current.duration;
          // Smooth sine ease in-out
          const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
          effX = -effRadius + ease * (w + effRadius * 2);
          effY = h / 2 + Math.sin(progress * Math.PI * 2) * (h * 0.2);
          effActive = true;
          effStrength = magnetStrength * 1.25;
          effRadius = magnetRadius * 1.15;
        } else if (elapsed > autoAnimRef.current.duration) {
          autoAnimRef.current.running = false;
        }
      }

      const effR2 = effRadius * effRadius;

      for (const p of pixelsRef.current) {
        if (effActive) {
          const dx = p.x - effX;
          const dy = p.y - effY;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < effR2) {
            const dist = Math.sqrt(dist2);
            const force =
              (1 - dist / effRadius) * effStrength * effRadius;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Spring back to origin
        p.vx += (p.ox - p.x) * returnSpeed;
        p.vy += (p.oy - p.y) * returnSpeed;

        // Damping
        p.vx *= 0.82;
        p.vy *= 0.82;

        p.x += p.vx;
        p.y += p.vy;

        ctx.fillRect(Math.round(p.x), Math.round(p.y), pixelSize, pixelSize);
      }

      rafRef.current = requestAnimationFrame(animate);
    }, [color, magnetRadius, magnetStrength, returnSpeed, pixelSize]);

    // Canvas setup & animation initiation
    useEffect(() => {
      buildPixels();
      rafRef.current = requestAnimationFrame(animate);

      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.ready.then(() => {
          buildPixels();
        });
      }

      const ro = new ResizeObserver(() => {
        buildPixels();
      });
      if (containerRef.current) ro.observe(containerRef.current);

      return () => {
        cancelAnimationFrame(rafRef.current);
        ro.disconnect();
      };
    }, [buildPixels, animate]);

    // Auto-play initial sweep & idle reminders
    useEffect(() => {
      if (!autoPlay) return;

      // Initial sweep right after preloader fades
      const initialTimer = setTimeout(() => {
        if (!userInteractedRef.current) {
          triggerAutoSweep(1300);
        }
      }, autoPlayDelay);

      // Gentle recurring sweep if idle and untouched
      const idleTimer = setInterval(() => {
        if (!userInteractedRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const inView =
            rect.top < window.innerHeight && rect.bottom > 0;
          if (inView) {
            triggerAutoSweep(1100);
          }
        }
      }, idleInterval);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(idleTimer);
      };
    }, [autoPlay, autoPlayDelay, idleInterval, triggerAutoSweep]);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        userInteractedRef.current = true;
        autoAnimRef.current.running = false;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true,
        };
      },
      []
    );

    const handleMouseLeave = useCallback(() => {
      mouseRef.current.active = false;
    }, []);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        userInteractedRef.current = true;
        autoAnimRef.current.running = false;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        // Radial burst on click
        const burstRadius = magnetRadius * 1.5;
        for (const p of pixelsRef.current) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < burstRadius) {
            const force = (1 - dist / burstRadius) * 12;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
      },
      [magnetRadius]
    );

    const handleTouchStart = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        userInteractedRef.current = true;
        autoAnimRef.current.running = false;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || e.touches.length === 0) return;
        const touch = e.touches[0];
        const cx = touch.clientX - rect.left;
        const cy = touch.clientY - rect.top;

        mouseRef.current = {
          x: cx,
          y: cy,
          active: true,
        };

        // Energetic touch burst for mobile
        const burstRadius = magnetRadius * 1.5;
        for (const p of pixelsRef.current) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < burstRadius) {
            const force = (1 - dist / burstRadius) * 12;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
      },
      [magnetRadius]
    );

    const handleTouchMove = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        userInteractedRef.current = true;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || e.touches.length === 0) return;
        const touch = e.touches[0];
        mouseRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          active: true,
        };
      },
      []
    );

    const handleTouchEnd = useCallback(() => {
      mouseRef.current.active = false;
    }, []);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: fontSize * 1.35,
          minWidth: 0,
          cursor: "pointer",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label={children}
      >
        {/* Immediate text fallback — renders synchronously on frame 0 */}
        <h1
          ref={textRef}
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: 0,
            margin: 0,
            padding: 0,
            fontSize: `clamp(32px, 8.5vw, ${fontSize}px)`,
            fontWeight,
            fontFamily: fontFamily || "inherit",
            color,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            userSelect: "none",
            pointerEvents: "none",
            transition: "opacity 0.2s ease",
          }}
        >
          {children}
        </h1>

        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            pointerEvents: "none",
            maxWidth: "100%",
            opacity: 0,
            transition: "opacity 0.2s ease",
          }}
        />
      </div>
    );
  }
);

export default PixelMagnet;
