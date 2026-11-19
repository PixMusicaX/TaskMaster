// Google Calendar fills the description of events it makes from Gmail (flights, trains,
// bookings) with the same boilerplate and a long link back to the email. Shown as is, it buries
// everything else, so the boilerplate is dropped and the link is kept apart, to show as a short
// "Open email" link.

const GMAIL_LINK = /https:\/\/mail\.google\.com\/mail\S*/i;
const BOILERPLATE = [
  /To see detailed information for automatically created events like this one,? use the official Google Calendar app\.?/gi,
  /https:\/\/g\.co\/calendar\S*/gi,
  /This event was created from an email you received in Gmail\.?/gi,
];

export function splitEventDescription(description: string | null | undefined): { text: string; gmailUrl: string | null } {
  if (!description) return { text: "", gmailUrl: null };
  const gmailUrl = description.match(GMAIL_LINK)?.[0] ?? null;
  let text = description.replace(GMAIL_LINK, "");
  for (const pattern of BOILERPLATE) text = text.replace(pattern, "");
  // What's left of the boilerplate's dashes and line breaks
  text = text.replace(/\s+/g, " ").replace(/^[\s\-–—·]+|[\s\-–—·]+$/g, "");
  return { text, gmailUrl };
}
