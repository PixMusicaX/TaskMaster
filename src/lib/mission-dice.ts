// The Smart Mission's dice. Like the Tavern's (lib/relief-dice.ts): a language model asked to
// "pick a difficulty at random" picks the same one most days, so the roll happens here and the
// prompt is told the result. The model still chooses the life area from what it reads.

type Rng = () => number;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

export const MISSION_DIFFICULTIES = [
  { name: "Easy", size: "a single focused act, under 10 minutes" },
  { name: "Medium", size: "a short session or a meaningful interaction, 10 to 30 minutes" },
  { name: "Hard", size: "a deep dive, creative challenge or bold act, 30 to 60 minutes" },
] as const;

// What kind of act the mission is, whatever area of life it lands in
export const MISSION_SHAPES = [
  "make something small and finish it",
  "reach out to one specific person",
  "learn one new thing and use it straight away",
  "move the body",
  "put one neglected thing in order",
  "explore something unfamiliar (a place, a genre, a tool, a recipe)",
  "return to something they used to enjoy",
  "give, share or teach something",
  "finish something left half-done",
  "notice something and record it (a photo, a sketch, a few lines)",
  "practise one skill deliberately",
  "do something kind for their future self",
] as const;

export interface MissionBrief {
  difficulty: (typeof MISSION_DIFFICULTIES)[number];
  shape: string;
  // True when the last missions went unfinished and today's was made light on purpose
  easedOff: boolean;
}

// `history` is newest first. After two unfinished missions in a row the next one is Easy.
export function rollMissionBrief(history: { completed: boolean }[], rng: Rng = Math.random): MissionBrief {
  const easedOff = history.length >= 2 && !history[0].completed && !history[1].completed;
  return {
    difficulty: easedOff ? MISSION_DIFFICULTIES[0] : pick(MISSION_DIFFICULTIES, rng),
    shape: pick(MISSION_SHAPES, rng),
    easedOff,
  };
}
