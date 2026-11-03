# 🎮 TaskMaster: Gamified Productivity & Life Log

**TaskMaster** is a premium, high-performance web application designed to turn your life into an RPG. Track habits, complete quests, capture daily thoughts, and gain XP to level up your character attributes (Strength, Intelligence, Wealth, Vitality, and Charisma).

Built with a stunning glass-morphism aesthetic and powered by AI, TaskMaster helps you visualize your growth and maintain consistency through a sophisticated gamification engine.

![The TaskMaster home page](docs/screenshots/home.jpg)

---

## ✨ Key Features

- **🛡️ Character Progression**: Level up your RPG attributes based on your real-life actions.
- **📅 Smart Calendar**: Manage "Main" and "Epic" quests with integrated browser notifications.
- **🧠 AI Intelligence**: Receive daily "Strategic Preparation Tips" and "Smart Missions" generated specifically for you by Google's Gemini AI.
- **⚔️ Weekly Raid**: Every Monday the Tavern turns into a raid on your weakest stats: three objectives, two for the lowest stat and one for the second lowest, each worth its own XP to the stat it targets, with a recap of last week.
- **📔 Daily Vault**: A bullet-style note-taking system with integrated mood tracking.
- **🏆 Hall of Fame**: Visualize your monthly progress with a seasonal ranking system.
- **📊 Detailed Analytics**: Character radars and stress metrics to visualize your journey.
- **🪐 Growth Orbit**: The home page's analytics play as one pinned scroll sequence inside a single orbit: standing, era, season pace, character stats, stress metrics, the tavern, future sight, chronicle, the map and the Taskmaster.
- **🎭 Persona Days**: Six random days a month, the whole app turns into Persona 3, 4 or 5: its own look, pause menu, map, music, AI voice and Growth Orbit animations.
- **📁 Archive System**: Robust tabular archives for notes and calendar events with a 7-year storage reach.

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/screenshots/landing.jpg" alt="Landing page"></td>
    <td><img src="docs/screenshots/calendar.jpg" alt="Calendar"></td>
  </tr>
  <tr>
    <td align="center">Landing page</td>
    <td align="center">Calendar</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/habits.jpg" alt="Habit tracker"></td>
    <td><img src="docs/screenshots/notes.jpg" alt="Daily notes"></td>
  </tr>
  <tr>
    <td align="center">Habit tracker</td>
    <td align="center">Daily notes</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/history.jpg" alt="History"></td>
    <td>
      <img src="docs/screenshots/mobile-home.jpg" alt="Home on a phone" width="49%">
      <img src="docs/screenshots/mobile-era.jpg" alt="The Growth Orbit's Era scene on a phone" width="49%">
    </td>
  </tr>
  <tr>
    <td align="center">History</td>
    <td align="center">On a phone: home and the orbit's Era scene</td>
  </tr>
</table>

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL (Neon)](https://neon.tech/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **AI Engine**: [Google Gemini Flash](https://aistudio.google.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for entrances and gestures, [anime.js](https://animejs.com/) for the scroll-driven Growth Orbit
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Fork & Clone
Fork the repository to your own GitHub account and clone it:
```bash
git clone https://github.com/YOUR_USERNAME/taskmaster.git
cd taskmaster
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys:

```env
# Database (Neon / Postgres)
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"

# Sign-in (Auth.js + Google). Generate the secret with: npx auth secret
AUTH_SECRET="a-long-random-string"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"

# Optional: a separate secret for encrypting players' AI keys (defaults to AUTH_SECRET).
# Changing whichever one is in use makes every saved AI key unreadable.
AI_KEY_SECRET="another-long-random-string"

# Optional: holidays on the calendar (Calendarific)
calendarific_key="YOUR_CALENDARIFIC_KEY"

# Optional: Unpooled connection for direct scripts
DATABASE_URL_UNPOOLED="postgresql://user:password@host/neondb?sslmode=require"
```

**Google sign-in:** create an OAuth client (type "Web application") in the
[Google Cloud console](https://console.cloud.google.com/apis/credentials) and add
`http://localhost:3000/api/auth/callback/google` (plus the same path on your deployed domain)
as an authorised redirect URI.

**Google Calendar sync (optional):** it uses the same OAuth client. In the Google Cloud console,
enable the Google Calendar API, add `http://localhost:3000/api/gcal/callback` (plus the same path
on your deployed domain) as another authorised redirect URI, and add the
`https://www.googleapis.com/auth/calendar.events.owned` scope to the consent screen. Sign-in doesn't ask
for this scope; each player connects from Account → Google Calendar. While the app is in testing
mode, only listed test users can connect and their access lasts seven days, so they'll need to
reconnect. Public use needs Google's app verification, and your Branding page should point to
`/privacy` and `/terms` on your domain.

**AI keys are per player, not in `.env`:** each account adds its own Gemini, Claude or Groq key
under Account → AI Guide. Without one the AI cards fall back to their offline versions. Every
request goes through `src/lib/ai-guard.ts`: identical requests in flight share one answer, each
player has a daily budget (`AI_DAILY_BUDGET`, 60 requests), and no request may run past its
deadline, so a slow provider never holds up the home page; the cards fall back to their offline
versions instead.

### 4. Database Setup
Push the schema to your database using Drizzle, then run the setup script once with the Google
address you will sign in with. It creates the read-only role "Ask the Taskmaster" runs its
queries as:
```bash
npx drizzle-kit push
node --env-file=.env scripts/migrate-multi-user.mjs you@gmail.com
```

**Upgrading a database from before accounts existed (v7 and earlier):** skip `drizzle-kit push`
and run only the script. It adds the sign-in tables and hands every existing record to that
address. Try it with `--dry-run` first; it prints what it would do and changes nothing.

**Upgrading for Google Calendar sync:** run `npx drizzle-kit push` once. It adds the sync columns
to `Event` and three new tables, and existing rows aren't changed.

**Upgrading to v8:** run `npx drizzle-kit push` once before deploying. It adds the `AiUsage` table
(the daily AI budget); nothing else in the database changes. Until it exists the budget isn't
enforced, and the server logs an error for each AI request.

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see your TaskMaster dashboard.

### 6. Checks
```bash
npm run lint
npm run typecheck
npm test
```

---

## 🪐 The Growth Orbit

Below today's cards, the home page pins a single orbit and plays the analytics through it, one scene per scroll.

<p align="center">
  <img src="docs/screenshots/orbit.gif" alt="The Growth Orbit moving from Standing through Era, Pace, Stats and Aura to Time" width="420">
</p>

<table>
  <tr>
    <td><img src="docs/screenshots/orbit-standing.jpg" alt="Standing"></td>
    <td><img src="docs/screenshots/orbit-pace.jpg" alt="Pace"></td>
  </tr>
  <tr>
    <td align="center">Standing</td>
    <td align="center">Pace</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/orbit-time.jpg" alt="Time"></td>
    <td><img src="docs/screenshots/orbit-precognition.jpg" alt="Precognition"></td>
  </tr>
  <tr>
    <td align="center">Time</td>
    <td align="center">Precognition</td>
  </tr>
</table>

- **Moving through it**: one wheel gesture, swipe or arrow key moves one scene. The legend under the orbit has previous and next buttons and a dot per scene, and a button at the right edge returns to the top.
- **Autoplay**: left idle for 8 seconds it moves on by itself, and from the last scene it rolls back to the first. Left idle for 20 seconds higher up the home page, the page scrolls down to the orbit and autoplay starts.
- **Light and dark**: the app opens in dark mode from 6pm to 6am and light mode otherwise, and switches at those hours while open.
- **Reduced motion**: with the system's reduced-motion setting on, nothing pins or animates and the analytics appear as plain cards instead.

The scroll script lives in `src/components/home/growth-saga.tsx`, with each later scene in its own `saga-*.tsx` file beside it. The orbit isn't part of the home page's first paint: `lazy-saga.tsx` loads it once the browser is idle or the page is scrolled near it, and the Persona dressings (`saga-p3/p4/p5.tsx`) only download on their own days. Everything in it animates by transform or opacity only. Avoid animating anything screen-sized there: each animated element gets its own GPU layer, and large ones can make mobile Safari kill the page.

---

## 🎭 Persona Days

Each month, six calendar days are picked at random (two each for Persona 3, 4 and 5). On those days the app takes that game's look, whatever your rank or era; every other day the normal design is untouched. The days are marked on the calendar, are the same on every device, and never fall next to each other.

**The pause menu** (press `M` or the Menu button):

<table>
  <tr>
    <td><img src="docs/screenshots/p3-menu.gif" alt="Persona 3 pause menu"></td>
    <td><img src="docs/screenshots/p4-menu.gif" alt="Persona 4 pause menu"></td>
    <td><img src="docs/screenshots/p5-menu.gif" alt="Persona 5 pause menu"></td>
  </tr>
  <tr>
    <td align="center">Persona 3</td>
    <td align="center">Persona 4</td>
    <td align="center">Persona 5</td>
  </tr>
</table>

**The home page and the Growth Orbit** inside each game's device:

<table>
  <tr>
    <td><img src="docs/screenshots/p3-home.jpg" alt="Persona 3 home page"></td>
    <td><img src="docs/screenshots/p4-home.jpg" alt="Persona 4 home page"></td>
    <td><img src="docs/screenshots/p5-home.jpg" alt="Persona 5 home page"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/p3-orbit.jpg" alt="Persona 3: the orbit as a disc in a music player"></td>
    <td><img src="docs/screenshots/p4-orbit.jpg" alt="Persona 4: the orbit on a TV"></td>
    <td><img src="docs/screenshots/p5-orbit.jpg" alt="Persona 5: the orbit on a smartphone"></td>
  </tr>
  <tr>
    <td align="center">Persona 3</td>
    <td align="center">Persona 4</td>
    <td align="center">Persona 5</td>
  </tr>
</table>

- **Look**: Persona 3 follows the clock (blue by day, the green Dark Hour at night), Persona 4 is always light and Persona 5 always dark.
- **Navigation**: the navbars give way to a floating Menu button (or the `M` key) and the in-game date. The menu is that game's pause screen, with every page on it.
- **Map and music**: the realm map becomes Tartarus, the Midnight Channel or Mementos. Its music plays from `public/persona/p3.mp3`, `p4.mp3` and `p5.mp3`; the tracks aren't included, so add your own.
- **AI voice**: missions, preparation tips, relief suggestions and the Taskmaster's answers are written in that game's style.
- **Growth Orbit**: the orbit plays inside that game's device. Persona 3 is a disc in a music player, with earphones, a track number and an equalizer. Persona 4 is the picture on a TV: each scene is a channel, changed with the remote through static, a white screen and colour bars. Persona 5 is a smartphone that is shaken, spun or tossed while the scene is swiped away in an app switcher.
- **Turning it off**: Account → Settings → "Persona days".

The schedule and helpers are in `src/lib/persona.ts`, the styles in `public/persona/persona-day.css` (loaded on Persona days only; the few rules every day needs stay in `src/app/persona.css`), the menu and chrome in `src/components/persona/`, and the orbit animations in `src/components/home/saga-p3.tsx`, `saga-p4.tsx` and `saga-p5.tsx`. In development, the dev tools have a "Persona day" row that forces a style on any day.

Fonts, images and video borrowed from the games and from fan recreations are listed in [CREDITS.md](CREDITS.md). They are there for a personal, non-commercial showcase; the MIT license below covers this project's own code only.

---

## 🏗️ Customization

### XP Values
You can adjust the gamification difficulty in `src/lib/constants.ts`:
```typescript
export const XP_VALUES = {
  HABIT_CHECK: 10,
  QUEST_SIDE: 40,
  QUEST_MAIN: 60,
  QUEST_EPIC: 80,
  NOTE_ENTRY: 10,
  TASK: 30,
  RAID: 35, // each Monday raid objective, to the stat it targets
};
```

### Character Ranks
Modify the level requirements and titles in the same constants file to fit your desired progression speed.

---

## 🔒 License
Distributed under the MIT License. See `LICENSE` for more information.

---

*Built for creatives who want to master their day and master their life.*
