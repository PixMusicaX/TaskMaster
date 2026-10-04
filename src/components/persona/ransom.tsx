import { cn } from "@/lib/utils";

// P5 ransom-note lettering: every letter cut from a different "magazine". Seeded by the text, so a
// word always looks the same.
const LOOKS = [
  { background: "#ffffff", color: "#0b0b0b" },
  { background: "#0b0b0b", color: "#ffffff" },
  { background: "#e5001b", color: "#ffffff" },
  { background: "#ffffff", color: "#e5001b" },
  { background: "transparent", color: "#ffffff" },
];
const FACES = ['"P5 Ransom", Anton, Impact, sans-serif', "Anton, Impact, sans-serif", '"Permanent Marker", cursive', "Oswald, sans-serif", '"Archivo Black", sans-serif'];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
}

export default function Ransom({ text, className, size = "1em" }: { text: string; className?: string; size?: string }) {
  const rand = hash(text);
  return (
    <span className={cn("p-ransom", className)} style={{ fontSize: size }} aria-label={text} role="img">
      {Array.from(text).map((ch, i) => {
        if (ch === " ") return <span key={i} aria-hidden style={{ width: "0.3em", padding: 0 }} />;
        const look = LOOKS[Math.floor(rand() * LOOKS.length)];
        const face = FACES[Math.floor(rand() * FACES.length)];
        const rotate = (rand() - 0.5) * 16;
        const scale = 0.85 + rand() * 0.4;
        return (
          <span
            key={i}
            aria-hidden
            style={{ ...look, fontFamily: face, transform: `rotate(${rotate.toFixed(1)}deg) scale(${scale.toFixed(2)})`, fontWeight: face.startsWith("Oswald") ? 700 : 400 }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
