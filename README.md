# 🎮 TaskMaster: Gamified Productivity & Life Log

**TaskMaster** is a premium, high-performance web application designed to turn your life into an RPG. Track habits, complete quests, capture daily thoughts, and gain XP to level up your character attributes (Strength, Intelligence, Wealth, Vitality, and Charisma).

Built with a stunning glass-morphism aesthetic and powered by AI, TaskMaster helps you visualize your growth and maintain consistency through a sophisticated gamification engine.

---

## ✨ Key Features

- **🛡️ Character Progression**: Level up your RPG attributes based on your real-life actions.
- **📅 Smart Calendar**: Manage "Main" and "Epic" quests with integrated browser notifications.
- **🧠 AI Intelligence**: Receive daily "Strategic Preparation Tips" and "Smart Missions" generated specifically for you by Google's Gemini AI.
- **📔 Daily Vault**: A bullet-style note-taking system with integrated mood tracking.
- **🏆 Hall of Fame**: Visualize your monthly progress with a seasonal ranking system.
- **📊 Detailed Analytics**: Character radars and stress metrics to visualize your journey.
- **🪐 Growth Orbit**: The home page's analytics play as one pinned scroll sequence inside a single orbit: standing, era, season pace, character stats, stress metrics, the tavern, future sight, chronicle, the map and the Taskmaster.
- **📁 Archive System**: Robust tabular archives for notes and calendar events with a 7-year storage reach.

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

# AI Engine (Google AI Studio)
gemini_key="YOUR_GEMINI_API_KEY"

# Optional: Unpooled connection for direct scripts
DATABASE_URL_UNPOOLED="postgresql://user:password@host/neondb?sslmode=require"
```

### 4. Database Setup
Push the schema to your database using Drizzle:
```bash
npx drizzle-kit push
```

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see your TaskMaster dashboard.

---

## 🪐 The Growth Orbit

Below today's cards, the home page pins a single orbit and plays the analytics through it, one scene per scroll.

- **Moving through it**: one wheel gesture, swipe or arrow key moves one scene. The legend under the orbit has previous and next buttons and a dot per scene, and a button at the right edge returns to the top.
- **Autoplay**: left idle for 8 seconds it moves on by itself, and from the last scene it rolls back to the first. Left idle for 20 seconds higher up the home page, the page scrolls down to the orbit and autoplay starts.
- **Light and dark**: the app opens in dark mode from 6pm to 6am and light mode otherwise, and switches at those hours while open.
- **Reduced motion**: with the system's reduced-motion setting on, nothing pins or animates and the analytics appear as plain cards instead.

The scroll script lives in `src/components/home/growth-saga.tsx`, with each later scene in its own `saga-*.tsx` file beside it. Everything in it animates by transform or opacity only. Avoid animating anything screen-sized there: each animated element gets its own GPU layer, and large ones can make mobile Safari kill the page.

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
};
```

### Character Ranks
Modify the level requirements and titles in the same constants file to fit your desired progression speed.

---

## 🔒 License
Distributed under the MIT License. See `LICENSE` for more information.

---

*Built for creatives who want to master their day and master their life.*
