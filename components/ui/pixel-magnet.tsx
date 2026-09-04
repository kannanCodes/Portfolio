"use client";

import { useEffect, useRef, useCallback } from "react";

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

export default function PixelMagnet({
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
}: PixelMagnetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const resolvedFont = fontFamily || getComputedStyle(document.body).fontFamily || "'Inter', sans-serif";

    // Auto-scale font size on narrow mobile screens so it fits naturally
    let drawSize = fontSize;
    ctx.font = `${fontWeight} ${drawSize}px ${resolvedFont}`;
    const metrics = ctx.measureText(children);
    if (metrics.width > w && w > 0) {
      drawSize = Math.max(28, Math.floor(drawSize * (w / metrics.width) * 0.96));
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

    const { x: mx, y: my, active } = mouseRef.current;
    const r2 = magnetRadius * magnetRadius;

    for (const p of pixelsRef.current) {
      if (active) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < r2) {
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / magnetRadius) * magnetStrength * magnetRadius;
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

  useEffect(() => {
    buildPixels();
    rafRef.current = requestAnimationFrame(animate);

    // Re-rasterize when web fonts have resolved
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || e.touches.length === 0) return;
    const touch = e.touches[0];
    mouseRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      active: true,
    };
  }, []);

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
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label={children}
    >
      {/* Immediate text fallback — renders synchronously on frame 0 so the name never has a blank delay */}
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
