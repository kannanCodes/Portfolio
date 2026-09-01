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
  const pixelsRef = useRef<Pixel[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Rasterise the text onto an off-screen canvas, sample every pixelSize px */
  const buildPixels = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Draw text to sample pixel positions
    const resolvedFont = fontFamily || getComputedStyle(document.body).fontFamily;
    ctx.font = `${fontWeight} ${fontSize}px ${resolvedFont}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const metrics = ctx.measureText(children);
    const textX = 0;
    const textY = h / 2;
    ctx.fillText(children, textX, textY);

    // Sample pixel data
    const imageData = ctx.getImageData(0, 0, w * dpr, h * dpr);
    const data = imageData.data;
    const pixels: Pixel[] = [];

    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        const ix = Math.round(px * dpr);
        const iy = Math.round(py * dpr);
        const idx = (iy * Math.round(w * dpr) + ix) * 4;
        if (data[idx + 3] > 128) {
          pixels.push({ ox: px, oy: py, x: px, y: py, vx: 0, vy: 0 });
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    pixelsRef.current = pixels;
  }, [children, fontSize, fontWeight, fontFamily, pixelSize, color]);

  /** Animation loop */
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext("2d")!;
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: fontSize * 1.6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={children}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", pointerEvents: "none" }}
      />
    </div>
  );
}
