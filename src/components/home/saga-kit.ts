// Shared geometry and type styles for the growth saga's drawn scenes (see growth-saga.tsx)

// Centre of the emblem's 400-unit box, and the radius of its main (rank path) ring
export const C = 200;
export const R = 184;

// A point in the emblem's box, by clock angle (0° is twelve o'clock) and radius
export const polar = (degrees: number, r: number) => {
  const angle = (degrees - 90) * (Math.PI / 180);
  return { x: Math.round((C + r * Math.cos(angle)) * 10) / 10, y: Math.round((C + r * Math.sin(angle)) * 10) / 10 };
};

// Which way a label outside the ring should run from its anchor point
export const anchorAt = (x: number) => (x > C + 40 ? "start" : x < C - 40 ? "end" : "middle");

export const CAPTION = "text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray";
export const TITLE = "font-display font-bold uppercase tracking-tight text-tm-purple-dark dark:text-tm-yellow";
