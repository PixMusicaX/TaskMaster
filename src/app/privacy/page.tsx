import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LEGAL_LINK as LINK, LegalList as List, LegalSection as Section } from "@/components/legal-page";
import { DEMO_HOURS } from "@/lib/demo";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/version";

export const metadata: Metadata = {
  title: "Privacy Policy | TaskMaster",
  description: "What TaskMaster stores, who it shares data with, and how Google Calendar data is handled.",
};

const LAST_UPDATED = "October 31, 2026";
const GOOGLE_DATA_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";

// When what the app collects or shares changes, this page and LAST_UPDATED change with it.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LAST_UPDATED}>
        <p>
          TaskMaster is a personal planner with tasks, a calendar, habits, notes and game-style progress. This policy explains what the
          hosted app stores, who it shares data with and what choices you have. If you run TaskMaster yourself from
          the <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LINK}>source code</a>, your own setup decides where your data goes.
        </p>

        <Section title="What we collect">
          <List>
            <li><strong className="text-foreground">Your Google account:</strong> your name, email address and profile picture, read when you sign in.</li>
            <li><strong className="text-foreground">What you put in your planner:</strong> tasks, events, special days, habits, notes, moods and progress.</li>
            <li><strong className="text-foreground">What you tell the AI about yourself:</strong> the optional About You fields, and your chosen AI service and API key.</li>
            <li><strong className="text-foreground">Your location, only if you allow it:</strong> your browser&apos;s coordinates are used to look up local weather and a place name. The place name and weather are saved with that day&apos;s suggestion, and your coordinates aren&apos;t stored in our database.</li>
            <li><strong className="text-foreground">Your devices:</strong> the browser type and sign-in time for each device, so you can see them and sign them out.</li>
            <li><strong className="text-foreground">Google Calendar data, only if you connect it:</strong> see the next section.</li>
          </List>
        </Section>

        <Section title="Google Calendar data">
          <p>
            Connecting Google Calendar is optional and separate from signing in. If you connect it, TaskMaster uses the{" "}
            <code className="text-sm">calendar.events</code> permission on your primary calendar to:
          </p>
          <List>
            <li>Read events from the day of your first sync onward, including titles, descriptions, times and whether you own or declined them.</li>
            <li>Store those details in your planner so they can appear on your calendar.</li>
            <li>Create, update and delete events in Google when you do so here: new items you sync, edits to synced items, and deletions of items that began in TaskMaster.</li>
          </List>
          <p>
            An access token that keeps the connection working is stored encrypted. Imported events stay out of AI features until you choose to add them to TaskMaster.
            Once you add one, it&apos;s treated like your other planner items, including being sent to the AI service you chose, as described below.
          </p>
          <p>
            You can disconnect at any time from Account → Google Calendar, which ends TaskMaster&apos;s access. Events already imported stay in your planner until you delete them.
          </p>
          <p>
            TaskMaster&apos;s use and transfer to any other app of information received from Google APIs will adhere to
            the <a href={GOOGLE_DATA_POLICY} target="_blank" rel="noopener noreferrer" className={LINK}>Google API Services User Data Policy</a>, including the Limited Use requirements.
            We use Google Calendar data only to provide the calendar features you can see in the app. We don&apos;t sell it, use it for advertising, or use it to train AI models.
          </p>
        </Section>

        <Section title="How we use your data">
          <p>
            We use your data only to run the planner for you: to show your items, work out your progress, write AI suggestions if you&apos;ve added an API key, and keep your account secure.
            There are no ads and no analytics trackers, and we don&apos;t sell your data.
          </p>
        </Section>

        <Section title="Who else receives data">
          <List>
            <li><strong className="text-foreground">Google:</strong> for sign-in, and for Calendar if you connect it.</li>
            <li><strong className="text-foreground">The AI service you pick (Google Gemini, Anthropic Claude or Groq):</strong> only if you add your own API key. It receives what it needs to write your quests, tips and answers, which can include your planner items, habits, notes, moods, About You fields, weather and place name. That service&apos;s own terms apply to your key.</li>
            <li><strong className="text-foreground">Open-Meteo and OpenStreetMap Nominatim:</strong> your coordinates, if you allow location, to get weather and a place name.</li>
            <li><strong className="text-foreground">Calendarific:</strong> the country you pick for holidays, with no personal details.</li>
            <li><strong className="text-foreground">Our hosting and database providers:</strong> they store and serve the app&apos;s data for us.</li>
            <li><strong className="text-foreground">Google Fonts and Transparent Textures:</strong> your browser loads some fonts and images from them, so they can see your IP address.</li>
          </List>
          <p>We may also disclose data if the law requires it.</p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>
            TaskMaster uses a sign-in cookie to keep you logged in, and a short-lived cookie to protect the Google Calendar connection step.
            Your browser also stores your settings, display progress and last known place and weather. None of this is used for tracking.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data travels over encrypted connections. API keys and the Google Calendar token are encrypted before they&apos;re stored, and your planner is separated from every other account.
            Planner content itself is not end-to-end encrypted, so the people running TaskMaster could technically access it. They do so only to fix a problem you&apos;ve reported, to keep the service secure, or if the law requires it.
          </p>
        </Section>

        <Section title="Keeping and deleting your data">
          <List>
            <li>We keep your data while you use your account.</li>
            <li>Items you delete are removed straight away. For events that began in Google, we keep the event&apos;s ID so it isn&apos;t imported again.</li>
            <li>Demo accounts and everything in them are deleted when you leave, or after {DEMO_HOURS} hours.</li>
            <li>You can delete your account and all its data yourself from Account → Cloud Storage. This also ends TaskMaster&apos;s access to Google Calendar. Events already in Google stay there.</li>
          </List>
        </Section>

        <Section title="Children">
          <p>TaskMaster isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>
        </Section>

        <Section title="Contact">
          <p>
            For questions or data requests, email <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>.
            Using TaskMaster is also covered by our <Link href="/terms" className={LINK}>Terms of Service</Link>.
          </p>
        </Section>
    </LegalPage>
  );
}
