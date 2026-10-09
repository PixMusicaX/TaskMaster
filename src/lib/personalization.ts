// What a player can tell the AI about themselves, and the holiday regions on offer
// (safe to import from the client)

export const PERSONAL_FIELDS = [
  { key: "about", label: "About you", hint: "What you do, where you are in life. e.g. Backend developer, works from home, new parent.", rows: 2 },
  { key: "interests", label: "Interests and hobbies", hint: "e.g. Guitar, football, cooking, sci-fi novels, trekking.", rows: 2 },
  { key: "goals", label: "What you're working toward", hint: "e.g. Run a 10k by March, ship my side project, read more, sleep earlier.", rows: 2 },
  { key: "avoid", label: "Anything to steer clear of", hint: "e.g. No gym suggestions (knee injury), vegetarian, no late-night tasks.", rows: 2 },
] as const;

export type PersonalKey = (typeof PERSONAL_FIELDS)[number]["key"];
export type Personalization = Record<PersonalKey, string>;
export const PERSONAL_MAX_LENGTH = 400;

export const EMPTY_PERSONALIZATION: Personalization = { about: "", interests: "", goals: "", avoid: "" };

export const hasPersonalization = (p: Personalization | null | undefined) =>
  !!p && PERSONAL_FIELDS.some(field => p[field.key]?.trim());

// Countries Calendarific has holidays for, as ISO codes. "" switches holidays off.
export const HOLIDAY_REGIONS: { code: string; name: string }[] = [
  { code: "", name: "No holidays" },
  { code: "AR", name: "Argentina" }, { code: "AU", name: "Australia" }, { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" }, { code: "BE", name: "Belgium" }, { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" }, { code: "CL", name: "Chile" }, { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" }, { code: "DK", name: "Denmark" }, { code: "EG", name: "Egypt" },
  { code: "FI", name: "Finland" }, { code: "FR", name: "France" }, { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" }, { code: "HK", name: "Hong Kong" }, { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" }, { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" }, { code: "JP", name: "Japan" }, { code: "KE", name: "Kenya" },
  { code: "MY", name: "Malaysia" }, { code: "MX", name: "Mexico" }, { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" }, { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" }, { code: "PK", name: "Pakistan" }, { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SG", name: "Singapore" }, { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" }, { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" }, { code: "TH", name: "Thailand" },
  { code: "TR", name: "Türkiye" }, { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" }, { code: "VN", name: "Vietnam" },
];
export const DEFAULT_HOLIDAY_REGION = "IN";
export const isHolidayRegion = (code: unknown): code is string =>
  typeof code === "string" && HOLIDAY_REGIONS.some(region => region.code === code);
