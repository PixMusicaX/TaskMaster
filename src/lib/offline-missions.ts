// What the Attention card shows when no AI writes it: an account with no API key, or a provider
// that is down. Everything here is picked in code, so it steers clear of what the player was
// given recently instead of cycling through the same handful.
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { normalizeTitle } from "./relief-dice";

type Rng = () => number;
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

// Marks a title as offline-made (the Tavern also uses it to keep these out of its memory)
export const OFFLINE_TAG = "[OFF]";
const tagged = (title: string) => `${title} ${OFFLINE_TAG}`;
const seen = (title: string, past: string[]) => past.some(p => normalizeTitle(p) === normalizeTitle(title));

// ─── Smart missions ───────────────────────────────────────────────────────────

type OfflineMission = { title: string; description: string };

export const OFFLINE_MISSIONS: Record<string, OfflineMission[]> = {
  people: [
    { title: "Message an Old Friend", description: "Send a real message to someone you haven't spoken to in months. Ask one question you want the answer to." },
    { title: "Give a Specific Compliment", description: "Tell someone exactly what they did well today. Name the detail, not just 'good job'." },
    { title: "Five-Minute Call", description: "Call instead of texting. Five minutes with a relative or friend, no agenda." },
    { title: "Thank Someone Properly", description: "Write two honest lines of thanks to a person who helped you recently, and send them." },
    { title: "Listen Without Fixing", description: "In your next conversation, ask two follow-up questions before offering any opinion or advice." },
    { title: "Share Something Good", description: "Send one person a song, article or photo you think they'd love, with a line about why." },
    { title: "Lunch With Company", description: "Eat one meal today with someone else, in person or on a call, phone face down." },
  ],
  body: [
    { title: "Ten-Minute Walk", description: "Walk for ten minutes without headphones. Notice three things you'd normally miss." },
    { title: "Stretch the Stiff Spots", description: "Spend five minutes on your neck, shoulders and hips. Slow, no bouncing." },
    { title: "Stairs Only", description: "Take the stairs every time today. Count the flights and note the total tonight." },
    { title: "Water Before Coffee", description: "Drink a full glass of water before each tea or coffee today." },
    { title: "Twenty of Anything", description: "Twenty squats, push-ups or sit-ups, your choice. Break them up if you need to." },
    { title: "Early Lights Out", description: "Be in bed thirty minutes earlier than usual tonight, screens left outside the room." },
    { title: "Stand and Reset", description: "Set three alarms. At each one, stand up, roll your shoulders and look out of a window for a minute." },
  ],
  mind: [
    { title: "Learn One Small Thing", description: "Pick something you've wondered about this week and spend ten minutes actually finding out." },
    { title: "Read Ten Pages", description: "Ten pages of a real book, not a feed. Stop mid-chapter if you have to." },
    { title: "Explain It Simply", description: "Take one thing you know well and write a three-sentence explanation a child could follow." },
    { title: "One Shortcut", description: "Learn one keyboard shortcut or tool trick for something you do every day, then use it five times." },
    { title: "Watch to Learn", description: "Watch one talk or tutorial under fifteen minutes on a subject outside your work." },
    { title: "Word of the Day", description: "Learn one word in a language you don't speak and use it in a message today." },
  ],
  craft: [
    { title: "Make Something Small", description: "Sketch, write four lines, or record a thirty-second melody. Finish it, however rough." },
    { title: "Photo Hunt", description: "Take five photos of one colour before the day ends. Keep the best one." },
    { title: "Cook One Thing Fresh", description: "Make one dish or drink from scratch today, even if it's only a proper cup of tea." },
    { title: "Fifteen Minutes of Practice", description: "Fifteen focused minutes on a hobby skill: one scale, one drill, one technique. Nothing else." },
    { title: "Rework an Old Piece", description: "Open something you made a while ago and improve one part of it." },
    { title: "Build a Playlist", description: "Put together eight songs for one specific mood and give the playlist a name." },
  ],
  order: [
    { title: "Clear One Surface", description: "Pick one desk, shelf or counter and clear it completely. Only put back what belongs." },
    { title: "Inbox Sweep", description: "Delete or archive twenty emails or notifications you'll never need again." },
    { title: "Fix the Small Annoyance", description: "Deal with one thing that has bugged you for weeks: a loose handle, a dead bulb, a broken link." },
    { title: "Empty the Downloads", description: "Sort or delete everything in your downloads folder. Keep it under ten files." },
    { title: "Tomorrow's Three", description: "Before bed, write tomorrow's three most important tasks and put what you need for the first one within reach." },
    { title: "One Bag Out", description: "Fill one bag with things to throw away, recycle or donate, and take it out today." },
    { title: "Unsubscribe From Five", description: "Unsubscribe from five mailing lists or mute five accounts that no longer earn your attention." },
  ],
  calm: [
    { title: "Two Quiet Minutes", description: "Sit for two minutes with your eyes closed, counting breaths. Start again each time you lose count." },
    { title: "Three Good Things", description: "Write down three things that went right today, however small." },
    { title: "Screen-Free Meal", description: "Eat one meal today with no screen at all. Just the food." },
    { title: "One Song, Nothing Else", description: "Play one favourite song start to finish and do nothing else while it plays." },
    { title: "Step Outside", description: "Stand outside for five minutes. No phone, no task, just the weather." },
    { title: "Brain Dump", description: "Write everything on your mind onto one page for five minutes, then circle the single thing that matters most." },
  ],
  explore: [
    { title: "A Different Route", description: "Take a different way to somewhere you go often and notice one new thing along it." },
    { title: "Try the Unfamiliar", description: "Eat, listen to or watch one thing you'd normally skip. Give it an honest ten minutes." },
    { title: "Local Discovery", description: "Find one place within twenty minutes of home that you've never been inside, and plan when to go." },
    { title: "Ask a Good Question", description: "Ask someone about a thing they know well and you don't. Listen for five minutes." },
    { title: "Old Favourite", description: "Revisit an album, game or film you loved years ago and see how it holds up." },
    { title: "Random Article", description: "Read one long article on a subject you know nothing about, start to finish." },
  ],
  future: [
    { title: "One Money Minute", description: "Check one balance or one subscription. Cancel or adjust the thing you'd forgotten about." },
    { title: "Back It Up", description: "Back up one thing you'd hate to lose: photos, a project folder, your notes." },
    { title: "Book the Thing", description: "Make the appointment or booking you keep putting off. Just the booking, nothing more." },
    { title: "Five-Minute Start", description: "Spend five minutes on the task you've been avoiding. Stop when the timer ends if you want to." },
    { title: "Letter to Next Month", description: "Write three lines to yourself a month from now about what you hope has changed." },
    { title: "Prep Tomorrow's Morning", description: "Lay out clothes, bag and breakfast tonight so tomorrow starts without a decision." },
  ],
};

// A mission the player hasn't had lately, from a different area than their last offline one.
// `recentTitles` is newest first.
export function pickOfflineMission(recentTitles: string[], rng: Rng = Math.random): OfflineMission {
  const areas = Object.keys(OFFLINE_MISSIONS);
  const areaOf = (title: string) => areas.find(a => OFFLINE_MISSIONS[a].some(m => seen(m.title, [title])));
  const lastArea = recentTitles.map(areaOf).find(Boolean);

  const fresh = areas.flatMap(area => OFFLINE_MISSIONS[area]
    .filter(m => !seen(m.title, recentTitles))
    .map(m => ({ area, mission: m })));
  const elsewhere = fresh.filter(f => f.area !== lastArea);
  const pool = elsewhere.length ? elsewhere : fresh.length ? fresh : areas.flatMap(area => OFFLINE_MISSIONS[area].map(m => ({ area, mission: m })));
  const { mission } = pick(pool, rng);
  return { title: tagged(mission.title), description: mission.description };
}

// ─── Preparation tips ─────────────────────────────────────────────────────────

type Upcoming = { title: string; type: string; date: string };
type TipTemplate = { title: (name: string) => string; description: (name: string, when: string) => string };

const short = (name: string) => (name.length > 28 ? `${name.slice(0, 27).trimEnd()}…` : name);

// For something happening today or tomorrow
const TIPS_IMMINENT: TipTemplate[] = [
  { title: n => `Final Check: ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Lay out everything it needs now, so nothing is hunted for at the last minute.` },
  { title: n => `Clear the Path to ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Move or cancel one smaller thing that could get in its way.` },
  { title: n => `First Step on ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Decide the very first action and do it before the day gets busy.` },
];
// Within the week
const TIPS_SOON: TipTemplate[] = [
  { title: n => `Scout Ahead: ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Spend ten minutes listing what it needs, then do the quickest item today.` },
  { title: n => `Gather Supplies for ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Check today whether you have to buy, book or ask anyone for something first.` },
  { title: n => `Halve ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Do the dullest part of the preparation today, so the day itself is lighter.` },
  { title: n => `Block Time for ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Put a fixed half hour for it on your calendar before that week fills up.` },
];
// Further out
const TIPS_LATER: TipTemplate[] = [
  { title: n => `Early Move on ${short(n)}`, description: (n, w) => `"${n}" is ${w}. One small step now beats a rush later: write down what "ready" looks like.` },
  { title: n => `Sound Out ${short(n)}`, description: (n, w) => `"${n}" is ${w}. If it depends on anyone else, send them a short message today.` },
  { title: n => `Map the Road to ${short(n)}`, description: (n, w) => `"${n}" is ${w}. Split the preparation into three steps and give each one a date.` },
];
// A special day (holiday, birthday, anniversary)
const TIPS_OCCASION: TipTemplate[] = [
  { title: n => `Mark ${short(n)}`, description: (n, w) => `${n} is ${w}. Decide now how you want to spend it, and tell anyone who should be part of it.` },
  { title: n => `Before ${short(n)}`, description: (n, w) => `${n} is ${w}. Shops and people get busy around it, so sort anything that can't wait today.` },
];
// Nothing on the calendar
const TIPS_QUIET: { title: string; description: string }[] = [
  { title: "Use the Quiet Stretch", description: "Nothing pressing is scheduled. Spend twenty minutes on the project that never gets a slot." },
  { title: "Plan the Week Ahead", description: "Your calendar is clear. Add the three things you want to happen in the next seven days." },
  { title: "Base Upkeep", description: "A calm schedule is the time for maintenance: update, clean or repair one tool you rely on." },
  { title: "Rest on Purpose", description: "No deadlines are close. Choose one evening this week to keep completely free, and protect it." },
  { title: "Review the Last Month", description: "With nothing urgent ahead, look back over last month's notes and pick one thing to do differently." },
  { title: "Stock the Shelves", description: "Use the lull to restock what always runs out at the wrong time: food, chargers, stationery, medicine." },
];

function whenText(date: string, today: string) {
  const days = differenceInCalendarDays(parseISO(date), parseISO(today));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `this ${format(parseISO(date), "EEEE")}`;
  return `in ${days} days, on ${format(parseISO(date), "MMM d")}`;
}

// A tip built from the calendar itself. `upcoming` holds pending items from today onwards;
// `recentTitles` are the tips of the last two weeks.
export function pickOfflinePrepTip(upcoming: Upcoming[], today: string, recentTitles: string[], rng: Rng = Math.random) {
  const byDate = [...upcoming].sort((a, b) => a.date.localeCompare(b.date));
  // The player's own plans come first; holidays only when there is nothing else
  const targets = [...byDate.filter(u => u.type !== "special_day"), ...byDate.filter(u => u.type === "special_day")];

  for (const target of targets.slice(0, 8)) {
    const days = differenceInCalendarDays(parseISO(target.date), parseISO(today));
    const templates = target.type === "special_day" ? TIPS_OCCASION : days <= 1 ? TIPS_IMMINENT : days < 7 ? TIPS_SOON : TIPS_LATER;
    const fresh = templates.filter(t => !seen(t.title(target.title), recentTitles));
    if (fresh.length === 0) continue;
    const template = pick(fresh, rng);
    return { title: tagged(template.title(target.title)), description: template.description(target.title, whenText(target.date, today)) };
  }

  const quiet = TIPS_QUIET.filter(t => !seen(t.title, recentTitles));
  const tip = pick(quiet.length ? quiet : TIPS_QUIET, rng);
  return { title: tagged(tip.title), description: tip.description };
}

// ─── Tavern ───────────────────────────────────────────────────────────────────

type OfflineRelief = { title: string; type: string; description: string; indoors: boolean };

const OFFLINE_RELIEFS: OfflineRelief[] = [
  { title: "Put On a Lo-fi Stream", type: "song", description: "Easy background for unwinding after a full day.", indoors: true },
  { title: "Rewatch a Comfort Film", type: "movie", description: "Something you know by heart asks nothing of you.", indoors: true },
  { title: "Walk Around the Block", type: "activity", description: "Ten minutes of air and movement resets most moods.", indoors: false },
  { title: "Cook Your Go-To Comfort Dish", type: "food", description: "A familiar recipe is restful in its own way.", indoors: true },
  { title: "Replay an Old Favourite Game", type: "game", description: "Half an hour somewhere you already know your way around.", indoors: true },
  { title: "Read a Chapter in Bed", type: "book", description: "A few pages of fiction to let the day go.", indoors: true },
  { title: "Sit Somewhere Green", type: "place", description: "A park bench and no plan for twenty minutes.", indoors: false },
  { title: "Queue Up a Podcast Episode", type: "podcast", description: "Let someone else do the talking for a while.", indoors: true },
  { title: "Play an Album Start to Finish", type: "song", description: "One whole record, in order, no skipping.", indoors: true },
  { title: "Watch a Short Documentary", type: "movie", description: "Twenty minutes inside a world that isn't yours.", indoors: true },
  { title: "Browse a Bookshop or Market", type: "place", description: "Wandering with nothing to buy is its own rest.", indoors: false },
  { title: "Make a Slow Cup of Tea", type: "food", description: "Do every step properly and drink it sitting down.", indoors: true },
];

const OFFLINE_ALTERNATIVES: { title: string; type: string; indoors: boolean }[] = [
  { title: "Quick 5-min Stretch", type: "activity", indoors: true },
  { title: "Hot Herbal Tea", type: "food", indoors: true },
  { title: "A Favourite Song, Eyes Closed", type: "song", indoors: true },
  { title: "Call Someone Easy to Talk To", type: "activity", indoors: true },
  { title: "A Few Pages of a Book", type: "book", indoors: true },
  { title: "Fruit and a Glass of Water", type: "food", indoors: true },
  { title: "Step Out for Fresh Air", type: "place", indoors: false },
  { title: "A Short Puzzle Game", type: "game", indoors: true },
  { title: "Tidy One Small Corner", type: "activity", indoors: true },
  { title: "An Episode of a Sitcom", type: "movie", indoors: true },
];

// A main pick and two alternatives of other types. Bad weather keeps everything indoors;
// `recentTitles` are the Tavern's latest main picks, newest first.
export function pickOfflineRelief(weather: string | undefined, recentTitles: string[], rng: Rng = Math.random) {
  const stayIn = /rain|storm|snow|fog/i.test(weather ?? "");
  const allowed = <T extends { indoors: boolean }>(list: T[]) => (stayIn ? list.filter(r => r.indoors) : list);

  const mains = allowed(OFFLINE_RELIEFS);
  const fresh = mains.filter(r => !seen(r.title, recentTitles));
  const main = pick(fresh.length ? fresh : mains, rng);

  const alternatives: { title: string; type: string }[] = [];
  let pool = allowed(OFFLINE_ALTERNATIVES).filter(a => a.type !== main.type);
  while (alternatives.length < 2 && pool.length) {
    const alt = pick(pool, rng);
    alternatives.push({ title: alt.title, type: alt.type });
    pool = pool.filter(a => a.type !== alt.type);
  }

  return { title: tagged(main.title), type: main.type, description: main.description, alternatives };
}
