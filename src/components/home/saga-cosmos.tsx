import { cn } from "@/lib/utils";

// The growth saga's backdrop: the orbit is the sun and every scene is a planet on its own ring,
// spreading out past the edges of the screen. The planet of the scene on stage is lit, and a wave
// runs out from the sun each time the scene changes.
//
// Keep this cheap for phones. Nothing large may be animated: an animated element gets its own
// GPU layer the size of its box, and a screen-filling ring per scene (at 3x pixel density) is
// enough to make mobile Safari kill the page. So the rings and rays are static, and only the
// planets (a few pixels each) and the wave move. See .tm-cosmos-* in app/ui.css.

// Ring radii grow from just outside the emblem, in vmax so they fill a wide screen
const FIRST_RING = 17;
const RING_STEP = 5.4;

export default function SagaCosmos({ scenes, active }: { scenes: { id: string; label: string }[]; active: number }) {
  return (
    <div data-saga="cosmos" aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
      {/* The sun's glow and its rays */}
      <div className="tm-cosmos-glow absolute left-1/2 top-1/2 w-[70vmax] h-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="tm-cosmos-rays absolute left-1/2 top-1/2 w-[160vmax] h-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full max-sm:hidden" />

      {/* A wave runs out from the sun whenever the scene changes */}
      <div key={active} className="tm-cosmos-wave absolute left-1/2 top-1/2 w-[24vmax] h-[24vmax] -ml-[12vmax] -mt-[12vmax] rounded-full border-2 border-tm-yellow/60" />

      {scenes.map((scene, i) => {
        const radius = FIRST_RING + i * RING_STEP;
        const lit = i === active;
        const size = 7 + (i * 5) % 8;
        return (
          <div key={scene.id}>
            <div
              className={cn("absolute left-1/2 top-1/2 rounded-full border transition-colors duration-700", lit ? "border-tm-yellow/40" : "border-tm-blue-gray/15")}
              style={{ width: `${radius * 2}vmax`, height: `${radius * 2}vmax`, marginLeft: `${-radius}vmax`, marginTop: `${-radius}vmax` }}
            />
            {/* The planet alone goes round, carried out to its ring by its own transform */}
            <span
              className="tm-cosmos-planet absolute left-1/2 top-1/2"
              style={{
                width: size,
                height: size,
                margin: -size / 2,
                "--orbit": `${radius}vmax`,
                animationDuration: `${70 + i * 22}s`,
                // Start each planet somewhere different, and send alternate ones the other way
                animationDelay: `${-((i * 37) % 100) * (0.7 + i * 0.22)}s`,
                animationDirection: i % 2 ? "reverse" : "normal",
              } as React.CSSProperties}
            >
              <span
                className={cn(
                  "block w-full h-full rounded-full transition-all duration-700",
                  lit ? "bg-tm-yellow scale-[1.8] shadow-[0_0_18px_var(--tm-yellow)]" : i % 3 === 0 ? "bg-tm-orange-dark/50" : i % 3 === 1 ? "bg-tm-blue-gray/50" : "bg-tm-orange-light/50"
                )}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
