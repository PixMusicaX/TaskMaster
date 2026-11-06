import { cn } from "@/lib/utils";

// Today's weather, sketched in the accent colour as if drawn over the clock with a marker: a sun
// rising behind the digits on a clear day (a crescent moon at night), a cloud with rain, snow or a
// bolt, or bands of fog. Drawn large and faded behind the time (see clock.tsx); the strokes draw
// themselves in once (.tm-sketch in app/ui.css).
// `weather` is the Tavern's word for the day (actions/relief.ts).

type Kind = "sun" | "moon" | "partly" | "fog" | "rain" | "snow" | "storm";

function kindOf(weather: string, night: boolean): Kind | null {
  const w = weather.toLowerCase();
  if (w.includes("storm")) return "storm";
  if (w.includes("snow")) return "snow";
  if (w.includes("rain")) return "rain";
  if (w.includes("fog")) return "fog";
  if (w.includes("cloud")) return "partly";
  if (w.includes("clear")) return night ? "moon" : "sun";
  return null;
}

// A ray of a sun centred at (cx, cy), from radius `from` to `to`, at `degrees` (0 = right, 90 = up)
const ray = (cx: number, cy: number, degrees: number, from: number, to: number) => {
  const a = (degrees * Math.PI) / 180;
  const p = (r: number) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy - Math.sin(a) * r).toFixed(1)}`;
  return `M${p(from)} L${p(to)}`;
};
// Eight rays round a sun, a long one and a short one in turn, as a hand would draw them
const rays = (cx: number, cy: number, inner: number, angles: number[]) =>
  angles.map((deg, i) => ray(cx, cy, deg, inner, inner + (i % 2 ? 7 : 11)));

const CLOUD = "M34 46 C20 47 19 30 33 30 C33 17 52 12 60 23 C66 11 88 14 86 30 C99 29 101 46 88 47 L36 47";
// Partly cloudy: a smaller cloud low and left, with the sun peeping out over its right shoulder
const LOW_CLOUD = "M26 58 C13 58 13 43 26 43 C27 31 44 27 51 37 C56 27 74 29 73 43 C84 43 85 58 75 58 L28 58";

const SKETCHES: Record<Kind, string[]> = {
  sun: [
    // A loop that runs a little past where it started, like a marker going round once
    "M76 30 C74 18 62 13 52 17 C42 21 39 34 44 43 C49 52 64 54 72 46 C78 40 78 32 74 26",
    ...rays(60, 34, 24, [90, 45, 0, -45, -90, -135, 180, 135]),
  ],
  moon: [
    "M66 10 C44 12 38 42 56 54 C68 62 86 58 92 46 C76 50 60 40 60 26 C60 18 63 13 66 10",
    "M30 22 L30 32 M25 27 L35 27",
    "M98 14 L98 21 M94.5 17.5 L101.5 17.5",
  ],
  partly: [
    // Only the part of the sun not behind the cloud: over the top from its left to its lower right
    "M64.8 23.2 A14 14 0 1 1 86 39.5",
    ...rays(78, 28, 19, [150, 110, 70, 30, -10]),
    LOW_CLOUD,
  ],
  fog: [
    "M22 30 C34 24 44 36 58 30 C72 24 84 36 98 30",
    "M30 44 C42 38 52 50 66 44 C80 38 90 50 102 44",
    "M20 58 C32 52 42 64 56 58 C70 52 80 64 94 58",
  ],
  rain: [CLOUD, "M44 54 L40 64", "M60 54 L56 66", "M76 54 L72 64"],
  snow: [CLOUD, "M44 55 L44 65 M39.7 57.5 L48.3 62.5 M39.7 62.5 L48.3 57.5", "M60 57 L60 67 M55.7 59.5 L64.3 64.5 M55.7 64.5 L64.3 59.5", "M76 55 L76 65 M71.7 57.5 L80.3 62.5 M71.7 62.5 L80.3 57.5"],
  storm: [CLOUD, "M64 49 L55 59 L64 59 L56 70"],
};

export default function WeatherSketch({ weather, night, className }: { weather: string; night: boolean; className?: string }) {
  const kind = kindOf(weather, night);
  if (!kind) return null;
  return (
    <svg
      key={kind}
      viewBox="-4 -10 128 82"
      role="img"
      aria-label={`Today's weather: ${weather}`}
      className={cn("tm-sketch text-tm-orange-dark overflow-visible pointer-events-none", className)}
    >
      <title>{weather}</title>
      {SKETCHES[kind].map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </svg>
  );
}
