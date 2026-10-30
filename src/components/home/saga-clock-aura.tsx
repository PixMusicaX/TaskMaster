import { useEffect, useRef, type RefObject } from "react";
import { hexToRgb } from "@/components/GaseousDivider";
import { prefersReducedMotion } from "@/lib/scroll-fx";
import { RING } from "./saga-tavern-scene";

// The gaseous divider (see GaseousDivider.tsx) bent into a circle round the Clock. At rest it sits
// behind the dial: it is really drawn over everything, with a hole the size of the dial cut out of
// it. To hand over to the Tavern the hole closes, so the gas rolls in over the watch, and then opens
// wide and blows away. All of that happens inside this one canvas, driven by the numbers the scroll
// script tweens, so nothing large is ever animated as a layer.

export interface AuraState {
  // How much of the gas is there at all, 0 to 1
  presence: number;
  // How thick it is: airy at rest, enough to hide the watch when closed
  density: number;
  // The radius of the hole, in the emblem's 400-unit box
  hole: number;
}

// How far the canvas reaches past the emblem, and how many units from the centre that makes
const REACH = 1.74;
const HALF = (400 * REACH) / 2;
const SEGS = 120;
const MAX_DPR = 1.5;
const LAYERS = [
  { spread: 66, alpha: 0.1, speed: 0.5, oct: 3 },
  { spread: 46, alpha: 0.18, speed: 0.7, oct: 4 },
  { spread: 30, alpha: 0.28, speed: 0.9, oct: 4 },
  { spread: 20, alpha: 0.4, speed: 1.1, oct: 5 },
  { spread: 12, alpha: 0.6, speed: 1.3, oct: 5 },
  { spread: 6, alpha: 0.85, speed: 1.5, oct: 6 },
];
// How far the gas's edge wanders, and how far its layers fan out along the hole as it closes, which
// feathers that edge (the canvas's own blur is missing from Safari)
const DRIFT = 20;
const FEATHER = 38;
// Whole numbers of waves round the circle, so the gas has no seam
const WAVES = [3, 5, 8, 13, 21, 34];

// The divider's noise, taken round a circle instead of along a line
function fbm(angle: number, t: number, octaves: number) {
  let v = 0, a = 1, tot = 0;
  for (let i = 0; i < octaves; i++) {
    v += Math.sin(angle * WAVES[i] + t * (0.9 + i * 0.4) + i * 2.1) * a;
    v += Math.cos(angle * (WAVES[i] + 1) + t * (1.3 + i * 0.3) + i * 1.4) * a * 0.7;
    tot += a;
    a *= 0.58;
  }
  return v / tot;
}

export default function ClockAura({ state, dial }: { state: RefObject<AuraState>; dial: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || prefersReducedMotion()) return;

    let raf = 0;
    let t = 0;
    let last = 0;
    let frames = 0;
    let blank = false;
    let colors = [hexToRgb("#F2C230"), hexToRgb("#F2921D")];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    const observer = new ResizeObserver(size);
    observer.observe(canvas);

    // A closed line round the centre, at the radius `at` gives for each angle
    const trace = (at: (angle: number) => number) => {
      for (let i = 0; i < SEGS; i++) {
        const angle = (i / SEGS) * Math.PI * 2;
        const r = Math.max(0, at(angle));
        if (i === 0) ctx.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const { presence, density, hole } = state.current;
      const dt = Math.min((now - last) / 16.666, 3);
      last = now;
      if (presence <= 0.005) {
        if (!blank) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        blank = true;
        return;
      }
      blank = false;
      // The theme's colours can change with the day, but not from frame to frame
      if (frames++ % 60 === 0) {
        const root = getComputedStyle(document.documentElement);
        colors = ["--tm-yellow", "--tm-orange-light"].map(name => hexToRgb(root.getPropertyValue(name).trim()));
      }
      const paint = ({ r, g, b }: { r: number; g: number; b: number }, alpha: number) => `rgba(${r},${g},${b},${alpha})`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const unit = canvas.width / (HALF * 2);
      ctx.setTransform(unit, 0, 0, unit, canvas.width / 2, canvas.height / 2);

      // The hole only wobbles and feathers away from the dial, whose edge it follows at rest
      const loose = Math.min(1, Math.abs(hole - dial) / 40);
      // Carried outward with the hole as it opens
      const base = Math.max(RING, hole + 20);
      LAYERS.forEach((layer, i) => {
        ctx.save();
        const edge = hole - loose * FEATHER * (1 - i / (LAYERS.length - 1));
        if (edge > 1) {
          ctx.beginPath();
          ctx.rect(-HALF, -HALF, HALF * 2, HALF * 2);
          trace(angle => edge + fbm(angle, t * 1.2 + i * 0.3, 5) * 24 * loose);
          ctx.clip("evenodd");
        }
        ctx.beginPath();
        trace(angle => {
          const bulge = 1 + 0.4 * Math.sin(angle * 2 + t * 0.8);
          const drift = fbm(angle, t * layer.speed, layer.oct) * DRIFT;
          return base + drift + layer.spread * bulge * (0.7 + 0.3 * Math.abs(fbm(angle, t * layer.speed + 10, 2)));
        });
        // Thinning out to nothing at its edge, which is what makes it gas and not paint
        const reach = base + layer.spread * 1.4 + DRIFT;
        const fade = ctx.createRadialGradient(0, 0, Math.max(0, base - 24), 0, 0, reach);
        const color = colors[i % 2];
        fade.addColorStop(0, paint(color, 1));
        fade.addColorStop(0.45, paint(color, 0.6));
        fade.addColorStop(1, paint(color, 0));
        ctx.globalAlpha = layer.alpha * density * presence;
        ctx.fillStyle = fade;
        ctx.fill();
        ctx.restore();
      });

      // The bright core line, and sparks travelling round it
      ctx.save();
      ctx.beginPath();
      trace(angle => base + 5 + fbm(angle, t * 1.6, 6) * 12);
      ctx.globalAlpha = 0.85 * presence;
      ctx.strokeStyle = paint(colors[0], 1);
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let spark = 0; spark < 3; spark++) {
        const angle = t * 0.35 + spark * 2.1;
        const r = base + 12 + fbm(angle, t * 2.1 + spark * 5, 4) * 22;
        ctx.beginPath();
        ctx.arc(r * Math.cos(angle), r * Math.sin(angle), 2 + Math.sin(t * 3 + spark), 0, Math.PI * 2);
        ctx.globalAlpha = 0.8 * presence;
        ctx.fillStyle = "white";
        ctx.fill();
      }
      ctx.restore();

      t += 0.0473 * dt;
    };

    // Only while it is on screen
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    let visible = false;
    const sync = () => (visible && !document.hidden ? start() : stop());
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    seen.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      observer.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [state, dial]);

  // Never wider than the screen, which on a phone only trims gas that has already thinned out
  return (
    <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square motion-reduce:hidden" style={{ width: `${REACH * 100}%`, maxWidth: "100vw" }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
