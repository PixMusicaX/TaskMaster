// A saved quote is "text — author" (see dailyQuoteFor). Only that spaced dash separates them: the
// quote itself can hold hyphens, and the last one wins in case it holds a spaced dash too.
const SEPARATOR = " — ";

export function splitQuote(raw: string) {
  const at = raw.lastIndexOf(SEPARATOR);
  return at === -1 ? { text: raw, author: "" } : { text: raw.slice(0, at), author: raw.slice(at + SEPARATOR.length) };
}
