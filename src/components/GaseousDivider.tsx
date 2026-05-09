"use client";

import { useEffect, useRef } from "react";

interface DividerProps {
  hoveredSide: "left" | "right" | "bottom" | null;
  variant?: "default" | "music" | "artpaint" | "dev" | "waltz" | "synthwave" | "battle" | "electronic" | "fusion" | "acoustic" | "anime" | "orchestral" | "legacy" | "dark";
  className?: string;
  align?: "left" | "right" | "bottom" | "top";
}

// Utility to parse hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

export const GaseousDivider = ({ hoveredSide, variant = "default", className = "", align = "left" }: DividerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredSideRef = useRef(hoveredSide);

  useEffect(() => {
    hoveredSideRef.current = hoveredSide;
  }, [hoveredSide]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;
    let lastTime = performance.now();
    const SEGS = 120;

    const resize = (entries?: ResizeObserverEntry[]) => {
      const dpr = window.devicePixelRatio || 1;
      const width = entries && entries[0] ? entries[0].contentRect.width : (canvas.clientWidth || 800);
      const height = entries && entries[0] ? entries[0].contentRect.height : (canvas.clientHeight || 800);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", () => resize());
    resize();

    function fbm(y: number, t: number, octaves: number) {
      let v = 0, a = 1, f = 1, tot = 0;
      for (let i = 0; i < octaves; i++) {
        v += Math.sin(y * 0.018 * f + t * (0.9 + i * 0.4) + i * 2.1) * a;
        v += Math.cos(y * 0.031 * f + t * (1.3 + i * 0.3) + i * 1.4) * a * 0.7;
        tot += a; a *= 0.58; f *= 2.1;
      }
      return v / tot;
    }

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      if (W === 0 || H === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const dpr = window.devicePixelRatio || 1;

      const currentHoveredSide = hoveredSideRef.current ?? "none";

      // Fetch current theme colors from computed styles
      const rootStyles = getComputedStyle(document.documentElement);
      const yellow = rootStyles.getPropertyValue('--tm-yellow').trim() || "#F2C230";
      const orangeLight = rootStyles.getPropertyValue('--tm-orange-light').trim() || "#F2921D";
      const blueGray = rootStyles.getPropertyValue('--tm-blue-gray').trim() || "#8082A6";
      const orangeDark = rootStyles.getPropertyValue('--tm-orange-dark').trim() || "#F24F13";

      const yellowRGB = hexToRgb(yellow);
      const orangeLightRGB = hexToRgb(orangeLight);
      const blueGrayRGB = hexToRgb(blueGray);
      const orangeDarkRGB = hexToRgb(orangeDark);

      ctx.save();
      if (currentHoveredSide === "left") {
        ctx.beginPath();
        ctx.rect(cx - 0.5, 0, W * 2, H);
        ctx.clip();
      } else if (currentHoveredSide === "right") {
        ctx.beginPath();
        ctx.rect(-W * 2, 0, cx + W * 2 + 0.5, H);
        ctx.clip();
      } else if (align === "top") {
        ctx.beginPath();
        ctx.rect(cx, 0, W, H);
        ctx.clip();
      }

      const layers = [
        { spread: 120, alpha: 0.10, speed: 0.5, oct: 3 },
        { spread: 80, alpha: 0.18, speed: 0.7, oct: 4 },
        { spread: 50, alpha: 0.28, speed: 0.9, oct: 4 },
        { spread: 35, alpha: 0.40, speed: 1.1, oct: 5 },
        { spread: 20, alpha: 0.60, speed: 1.3, oct: 5 },
        { spread: 10, alpha: 0.85, speed: 1.5, oct: 6 },
      ];

      for (const layer of layers) {
        const pts = [];
        for (let i = 0; i <= SEGS; i++) {
          const y = (i / SEGS) * H;
          const yNorm = i / SEGS;
          const env = Math.pow(Math.sin(yNorm * Math.PI), 0.4);
          const bulge = 1 + 0.4 * Math.sin(yNorm * Math.PI * 2 + t * 0.8);
          const baseY = y / dpr;
          const dx = fbm(baseY, t * layer.speed, layer.oct) * 28 * env * dpr;
          const hw = layer.spread * env * bulge * (0.7 + 0.3 * Math.abs(fbm(baseY, t * layer.speed + 10, 2))) * dpr;

          let lEdge = dx - hw;
          let rEdge = dx + hw;

          if (currentHoveredSide === "left") {
            lEdge = 0;
            rEdge = hw * 1.5 + Math.abs(dx) * 1.2;
          } else if (currentHoveredSide === "right") {
            rEdge = 0;
            lEdge = -hw * 1.5 - Math.abs(dx) * 1.2;
          }

          pts.push({ y, lEdge, rEdge });
        }

        ctx.beginPath();
        ctx.moveTo(cx + pts[0].lEdge, pts[0].y);
        for (let i = 1; i <= SEGS; i++) {
          const p = pts[i], pp = pts[i - 1];
          const mx = Math.round((cx + p.lEdge + cx + pp.lEdge) / 2);
          const my = Math.round((p.y + pp.y) / 2);
          ctx.quadraticCurveTo(Math.round(cx + pp.lEdge), Math.round(pp.y), mx, my);
        }
        for (let i = SEGS; i >= 0; i--) {
          const p = pts[i], pn = pts[Math.min(i + 1, SEGS)];
          const mx = Math.round((cx + p.rEdge + cx + pn.rEdge) / 2);
          const my = Math.round((p.y + pn.y) / 2);
          ctx.quadraticCurveTo(Math.round(cx + pn.rEdge), Math.round(pn.y), mx, my);
        }
        ctx.closePath();

        const g = ctx.createLinearGradient(0, 0, 0, H);
        if (variant === "artpaint") {
          g.addColorStop(0, `rgba(${yellowRGB.r},${yellowRGB.g},${yellowRGB.b},0)`);
          g.addColorStop(0.2, `rgba(${yellowRGB.r},${yellowRGB.g},${yellowRGB.b},${layer.alpha})`);
          g.addColorStop(0.5, `rgba(${orangeLightRGB.r},${orangeLightRGB.g},${orangeLightRGB.b},${layer.alpha})`);
          g.addColorStop(0.8, `rgba(${blueGrayRGB.r},${blueGrayRGB.g},${blueGrayRGB.b},${layer.alpha})`);
          g.addColorStop(1, `rgba(${blueGrayRGB.r},${blueGrayRGB.g},${blueGrayRGB.b},0)`);
        } else if (variant === "dark") {
          g.addColorStop(0, `rgba(0,0,0,0)`);
          g.addColorStop(0.04, `rgba(0,0,0,${layer.alpha})`);
          g.addColorStop(0.5, `rgba(0,0,0,${layer.alpha})`);
          g.addColorStop(0.96, `rgba(0,0,0,${layer.alpha})`);
          g.addColorStop(1, `rgba(0,0,0,0)`);
        } else {
          // Keep other variants hardcoded or map them too if needed, 
          // but "artpaint" is the main one used in Navbar.
          // For now, let's just make "artpaint" dynamic.
          g.addColorStop(0, `rgba(255,255,255,0)`);
          g.addColorStop(0.04, `rgba(255,255,255,${layer.alpha})`);
          g.addColorStop(0.5, `rgba(255,255,255,${layer.alpha})`);
          g.addColorStop(0.96, `rgba(255,255,255,${layer.alpha})`);
          g.addColorStop(1, `rgba(255,255,255,0)`);
        }
        ctx.fillStyle = g;
        ctx.fill();
      }

      ctx.beginPath();
      let firstPt = true;
      for (let i = 0; i <= SEGS; i++) {
        const y = (i / SEGS) * H;
        const yNorm = i / SEGS;
        const env = Math.pow(Math.sin(yNorm * Math.PI), 0.3);
        const baseY = y / dpr;

        let dx = fbm(baseY, t * 1.6, 6) * 18 * env * dpr;
        if (currentHoveredSide === "left") {
          dx = Math.abs(dx) * 1.2;
        } else if (currentHoveredSide === "right") {
          dx = -Math.abs(dx) * 1.2;
        }

        if (firstPt) { ctx.moveTo(cx + dx, y); firstPt = false; }
        else {
          const py = ((i - 1) / SEGS) * H;
          const safeNorm = Math.max(0, (i - 1) / SEGS);
          let pdx = fbm(py / dpr, t * 1.6, 6) * 18 * Math.pow(Math.max(0, Math.sin(safeNorm * Math.PI)), 0.3) * dpr;

          if (currentHoveredSide === "left") {
            pdx = Math.abs(pdx) * 1.2;
          } else if (currentHoveredSide === "right") {
            pdx = -Math.abs(pdx) * 1.2;
          }

          ctx.quadraticCurveTo(cx + pdx, py, cx + (dx + pdx) / 2, (y + py) / 2);
        }
      }

      const cg = ctx.createLinearGradient(0, 0, 0, H);
      if (variant === "artpaint") {
        cg.addColorStop(0, `rgba(${yellowRGB.r},${yellowRGB.g},${yellowRGB.b},0)`);
        cg.addColorStop(0.2, `rgba(${yellowRGB.r},${yellowRGB.g},${yellowRGB.b},1)`);
        cg.addColorStop(0.5, `rgba(${orangeLightRGB.r},${orangeLightRGB.g},${orangeLightRGB.b},1)`);
        cg.addColorStop(0.8, `rgba(${blueGrayRGB.r},${blueGrayRGB.g},${blueGrayRGB.b},1)`);
        cg.addColorStop(1, `rgba(${blueGrayRGB.r},${blueGrayRGB.g},${blueGrayRGB.b},0)`);
      } else {
        cg.addColorStop(0, 'rgba(255,255,255,0)');
        cg.addColorStop(0.04, 'rgba(255,255,255,1)');
        cg.addColorStop(0.5, 'rgba(255,255,255,1)');
        cg.addColorStop(0.96, 'rgba(255,255,255,1)');
        cg.addColorStop(1, 'rgba(255,255,255,0)');
      }
      ctx.strokeStyle = cg;
      ctx.lineWidth = 2.5 * dpr;
      ctx.stroke();

      for (let spark = 0; spark < 3; spark++) {
        const sy = H * (0.1 + 0.8 * ((t * 0.7 + spark * 1.7) % 1));
        const yNorm = sy / H;
        const env = Math.pow(Math.sin(yNorm * Math.PI), 0.4);
        let sdx = fbm(sy / dpr, t * 2.1 + spark * 5, 4) * 22 * env * dpr;
        const jitter = Math.sin(t * 5 + spark * 10) * 8 * dpr;

        if (currentHoveredSide === "left") {
          sdx = Math.abs(sdx) * 1.2 + jitter;
        } else if (currentHoveredSide === "right") {
          sdx = -Math.abs(sdx) * 1.2 - jitter;
        }

        const sAlpha = Math.pow(Math.sin(yNorm * Math.PI), 2) * 0.7;
        ctx.beginPath();
        const sparkRadius = (1.5 + (Math.sin(t * 3 + spark) * 0.5 + 0.5)) * dpr;
        ctx.arc(Math.round(cx + sdx), Math.round(sy), sparkRadius, 0, Math.PI * 2);

        let fillColor = `rgba(255,255,255,${sAlpha})`;
        const depth = (spark / 3 + t * 0.1) % 1;

        if (variant === "artpaint") {
          fillColor = depth > 0.6 ? `rgba(${orangeDarkRGB.r},${orangeDarkRGB.g},${orangeDarkRGB.b},${sAlpha})` : depth > 0.3 ? `rgba(${orangeLightRGB.r},${orangeLightRGB.g},${orangeLightRGB.b},${sAlpha})` : `rgba(${yellowRGB.r},${yellowRGB.g},${yellowRGB.b},${sAlpha})`;
        }
        ctx.fillStyle = fillColor;
        ctx.fill();
      }

      const now = performance.now();
      const dt = (now - lastTime) / 16.666;
      lastTime = now;

      const speedMult = currentHoveredSide !== "none" ? 2.5 : 1.3;
      t += 0.0364 * speedMult * dt;

      ctx.restore();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", () => resize());
      cancelAnimationFrame(animationFrameId);
    };
  }, [align, variant]);

  const alignStyle = align === "left"
    ? { left: 0, transform: 'translateX(-50%)', top: '-10%', bottom: '-10%', width: 800 }
    : align === "right"
      ? { right: 0, transform: 'translateX(50%)', top: '-10%', bottom: '-10%', width: 800 }
      : align === "top"
        ? { top: 0, left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', width: 400, height: 'max(100vw, 1200px)' }
        : { bottom: 0, left: '50%', transform: 'translate(-50%, 50%) rotate(-90deg)', width: 400, height: 'max(100vw, 1200px)' };

  return (
    <div
      className={`absolute z-30 pointer-events-none ${variant === "default" ? "mix-blend-difference" : ""} ${className}`}
      style={{
        ...alignStyle,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-90"
        style={{
          display: "block",
        }}
      />
    </div>
  );
};