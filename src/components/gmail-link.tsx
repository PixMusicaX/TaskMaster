import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// The link back to the email a Google Calendar event was made from (see event-description.ts),
// as a small box like the time beside an event
export default function GmailLink({ href, className, style }: { href: string; className?: string; style?: React.CSSProperties }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Open the email this came from"
      className={cn("inline-flex items-center gap-1 align-middle text-caption font-black px-1.5 py-0.5 rounded bg-tm-yellow/10 text-tm-yellow hover:bg-tm-yellow/20 transition-colors", className)}
      style={style}
    >
      <Mail size={12} strokeWidth={2.6} /> Email
    </a>
  );
}
