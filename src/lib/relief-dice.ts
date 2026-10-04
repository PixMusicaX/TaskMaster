// The Tavern's dice. Language models are poor at being random: asked for "a film", they return the
// same handful of famous ones. So the randomness is rolled here and handed to the prompt: which
// types to suggest today, and an "angle" for each (a decade, a region, a genre) that steers the
// pick somewhere it hasn't been.

export const RELIEF_TYPES = ["movie", "song", "activity", "food", "game", "book", "podcast", "place", "article"] as const;
export type ReliefType = (typeof RELIEF_TYPES)[number];

type Rng = () => number;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const FILM_REGIONS = [
  "Japanese", "Korean", "Hong Kong", "Iranian", "French", "Italian", "Scandinavian", "British", "Latin American",
  "American indie", "Hindi", "Bengali", "Malayalam", "Tamil", "Marathi", "animated (any country)", "documentary (any country)",
];
const FILM_GENRES = [
  "comedy", "heist", "slice of life", "coming-of-age", "mystery", "road movie", "sports", "science fiction", "fantasy",
  "romance", "thriller", "musical", "war or history", "family", "satire", "feel-good drama",
];
const SONG_GENRES = [
  "jazz", "city pop", "indie folk", "lo-fi or ambient", "classic rock", "soul or funk", "electronic", "hip-hop", "post-rock",
  "bossa nova", "film soundtrack", "Hindustani or Carnatic fusion", "indie pop", "shoegaze or dream pop", "R&B", "synthwave",
  "singer-songwriter", "math rock", "disco", "video game soundtrack",
];
const SONG_ERAS = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "the last three years"];
const SONG_LANGUAGES = ["English", "Hindi", "Japanese", "Bengali", "Korean", "Spanish or Portuguese", "French", "instrumental", "Tamil or Malayalam", "any language"];

const ANGLES: Record<ReliefType, (rng: Rng) => string> = {
  movie: rng => `${pick(FILM_REGIONS, rng)} · ${pick(DECADES, rng)} · ${pick(FILM_GENRES, rng)}`,
  song: rng => `${pick(SONG_GENRES, rng)} · ${pick(SONG_ERAS, rng)} · ${pick(SONG_LANGUAGES, rng)}`,
  game: rng => pick([
    "a cozy indie game", "a classic from before 2010", "a short story game (under 5 hours)", "a puzzle game", "a roguelike",
    "a couch co-op or party game", "a free browser or mobile gem", "a rhythm or music game", "a strategy or city-builder",
  ], rng),
  book: rng => pick([
    "a short story or novella", "an essay collection", "a graphic novel or manga volume", "popular science", "a memoir",
    "a mystery", "science fiction or fantasy", "a poetry collection", "a classic under 200 pages", "translated fiction",
  ], rng),
  podcast: rng => pick([
    "history", "science", "true story or documentary", "comedy", "music or film deep-dive", "design or how things work",
    "interview with a maker or artist", "technology", "philosophy or ideas", "food or travel",
  ], rng),
  article: rng => pick([
    "a longread about space or nature", "a profile of a craftsperson or artist", "the history of an everyday object",
    "a piece about cities or architecture", "a science explainer", "an essay about work and rest", "sports writing", "a food essay",
    "an oral history of a film, album or game",
  ], rng),
  food: rng => pick([
    "something to cook in under 30 minutes", "street food to order", "a regional dish from their area", "a dessert",
    "a drink, hot or cold to suit the weather", "a snack from another cuisine", "a comfort bowl (noodles, rice or soup)",
    "breakfast food, whatever the hour",
  ], rng),
  activity: rng => pick([
    "outdoors, if the weather allows", "indoors and hands-on", "moving the body: stretch, walk or dance", "making something small",
    "with one other person", "solo and quiet", "tidying or rearranging one small space", "learning one tiny skill",
  ], rng),
  place: rng => pick([
    "somewhere green", "somewhere with water", "a place to browse (bookshop, market, record store)", "a quiet indoor spot",
    "a viewpoint or rooftop", "somewhere new within 20 minutes", "a café they've never tried", "a museum, gallery or old building",
  ], rng),
};

export interface ReliefBrief {
  main: { type: ReliefType; angle: string };
  alternatives: { type: ReliefType; angle: string }[];
}

// Today's three types, all different. The main one avoids the main types of the last few days.
export function rollReliefBrief(recentMainTypes: (string | null | undefined)[], rng: Rng = Math.random): ReliefBrief {
  const recent = new Set(recentMainTypes.slice(0, 3));
  const fresh = RELIEF_TYPES.filter(t => !recent.has(t));
  const main = pick(fresh.length ? fresh : RELIEF_TYPES, rng);

  const rest = RELIEF_TYPES.filter(t => t !== main);
  const alt1 = pick(rest, rng);
  const alt2 = pick(rest.filter(t => t !== alt1), rng);

  const withAngle = (type: ReliefType) => ({ type, angle: ANGLES[type](rng) });
  return { main: withAngle(main), alternatives: [withAngle(alt1), withAngle(alt2)] };
}

// "The Grand Budapest Hotel (2014)" and "the grand budapest hotel" are the same suggestion
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isRepeat(title: string, pastTitles: string[]): boolean {
  const t = normalizeTitle(title);
  if (!t) return false;
  return pastTitles.some(p => normalizeTitle(p) === t);
}
