import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LEGAL_LINK, LegalList, LegalSection } from "@/components/legal-page";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/version";

export const metadata: Metadata = {
  title: "Terms of Service | TaskMaster",
  description: "The terms for using the hosted TaskMaster planner.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 31, 2026">
      <p>
        These terms cover your use of the hosted TaskMaster planner. By signing in or using the demo, you agree to them. How your data is
        handled is explained in our <Link href="/privacy" className={LEGAL_LINK}>Privacy Policy</Link>. The{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>source code</a> has its own licence terms.
      </p>

      <LegalSection title="The service">
        <p>
          TaskMaster is a free personal planner with tasks, a calendar, habits, notes and game-style progress. It&apos;s a personal project, so features may change or
          stop, and the service may be unavailable at times.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList>
          <li>You sign in with your Google account and are responsible for what happens under it.</li>
          <li>You must be at least 13 years old.</li>
          <li>What you put in your planner stays yours. You give us only the permission needed to store it and show it to you.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>Please don&apos;t:</p>
        <LegalList>
          <li>Break the law, or use TaskMaster to harm anyone.</li>
          <li>Try to reach other people&apos;s data, or get around the app&apos;s limits or security.</li>
          <li>Overload the service, or use automated tools to abuse it or the demo.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="AI features">
        <p>
          AI features use your own API key from the service you choose. You&apos;re responsible for following that service&apos;s terms and for any charges on your key.
          AI suggestions can be wrong, so use your own judgement, especially on health, money or safety.
        </p>
      </LegalSection>

      <LegalSection title="Google Calendar">
        <p>
          Connecting Google Calendar is optional. Editing a synced item here changes the real Google event, and guests on a meeting you organise will see the change on their calendars.
          Please read Sync logic in the app before relying on it. You&apos;re responsible for changes you make through TaskMaster.
        </p>
      </LegalSection>

      <LegalSection title="XP and progress">
        <p>XP, levels, ranks and seasons are just for fun. They have no money value, can&apos;t be exchanged, and may be recalculated or reset as the app changes.</p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          TaskMaster is provided as it is, without warranties of any kind. We can&apos;t promise it will always work, be error-free, or keep your data safe from loss, so keep your own copy of anything important.
          To the extent the law allows, we aren&apos;t liable for any loss that comes from using the service, including lost data, missed events or calendar changes.
        </p>
      </LegalSection>

      <LegalSection title="Ending your use">
        <p>
          You can stop using TaskMaster at any time. You can also delete your account yourself from Account → Cloud Storage. That permanently removes the account and everything in it,
          and it can&apos;t be undone. Events already in Google Calendar stay there.
          We may suspend or close accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>If these terms change, we&apos;ll update this page and the date at the top. Using TaskMaster after that means you accept the new terms.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For questions about these terms, email <a href={`mailto:${CONTACT_EMAIL}`} className={LEGAL_LINK}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
