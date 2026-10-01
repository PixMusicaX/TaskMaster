// The growth saga's backdrop: the orbit as a sun, with a soft glow, rays, and a wave that runs out
// from it each time the scene changes.
//
// Keep this cheap for phones. Nothing large may be animated: an animated element gets its own
// GPU layer the size of its box, and screen-filling animated layers (at 3x pixel density) are
// enough to make mobile Safari kill the page. The glow and rays are static; only the wave moves.
// See .tm-cosmos-* in app/ui.css.
export default function SagaCosmos({ active }: { active: number }) {
  return (
    <div data-saga="cosmos" aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
      <div className="tm-cosmos-glow absolute left-1/2 top-1/2 w-[70vmax] h-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="tm-cosmos-rays absolute left-1/2 top-1/2 w-[160vmax] h-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full max-sm:hidden" />
      {/* Keyed by the scene so it plays again on every change */}
      <div key={active} className="tm-cosmos-wave absolute left-1/2 top-1/2 w-[24vmax] h-[24vmax] -ml-[12vmax] -mt-[12vmax] rounded-full border-2 border-tm-yellow/60" />
    </div>
  );
}
