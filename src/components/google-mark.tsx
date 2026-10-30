import { ArrowDown, ArrowUp } from "lucide-react";

// Google's own look. Imported events wear it until they're added to TaskMaster, so these colours
// are fixed values: era, Persona and special-day themes never reach them.
export const GOOGLE = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
  surface: "#FFFFFF",
  border: "#DADCE0",
  text: "#1F1F1F",
  muted: "#5F6368",
} as const;

export const GOOGLE_STRIPE = `linear-gradient(to right, ${GOOGLE.blue} 25%, ${GOOGLE.red} 25% 50%, ${GOOGLE.yellow} 50% 75%, ${GOOGLE.green} 75%)`;

// Google's "G", inline so it needs no extra asset
export function GoogleMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className}>
      <path fill={GOOGLE.blue} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill={GOOGLE.green} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill={GOOGLE.yellow} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill={GOOGLE.red} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// On a TaskMaster item that's synced: which way it first went, up to Google or down from it
export function GoogleSyncMark({ fromGoogle, className }: { fromGoogle: boolean; className?: string }) {
  const Arrow = fromGoogle ? ArrowDown : ArrowUp;
  const label = fromGoogle ? "Came from Google Calendar" : "Created here, synced to Google Calendar";
  return (
    <span role="img" aria-label={label} title={label} className={className}>
      <span className="flex items-center gap-0.5">
        <GoogleMark size={14} />
        <Arrow size={10} strokeWidth={3} className="text-tm-blue-gray" />
      </span>
    </span>
  );
}

// An imported event inside a day of the month grid
export function GoogleChip({ title }: { title: string }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-bold border"
      style={{ background: GOOGLE.surface, borderColor: GOOGLE.border, color: GOOGLE.text }}
    >
      <GoogleMark size={9} className="shrink-0" />
      <span className="truncate">{title}</span>
    </div>
  );
}

// An imported event on the phone-sized month grid, which only has room for a dot
export function GoogleDot() {
  return (
    <div
      className="w-1 h-1 rounded-full"
      style={{ background: `conic-gradient(${GOOGLE.blue} 25%, ${GOOGLE.red} 25% 50%, ${GOOGLE.yellow} 50% 75%, ${GOOGLE.green} 75%)` }}
    />
  );
}
