const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

function isLanguage(code: string): code is Language {
  return (LANGUAGES as readonly string[]).includes(code);
}

// Strings follow the first preferred language the app ships, so a French-then-Spanish device
// reads Spanish rather than the English fallback.
export function resolveLanguage(languageTags: string[]): Language {
  for (const tag of languageTags) {
    const code = tag.split("-")[0].toLowerCase();
    if (isLanguage(code)) return code;
  }
  return "en";
}

// Two decimals covers fractional plates (1.25 kg) without showing float noise.
export function formatDecimal(value: number, languageTag: string) {
  return new Intl.NumberFormat(languageTag, { maximumFractionDigits: 2 }).format(value);
}

// Fields don't group thousands: parseDecimal would read the "." in "1.012,5" as the decimal point.
export function formatEditableDecimal(value: number, languageTag: string) {
  return new Intl.NumberFormat(languageTag, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

// Lifters type whichever separator their keyboard shows, whatever the device locale.
export function parseDecimal(text: string) {
  return text === "" ? null : Number(text.replace(",", "."));
}

// The device's 12/24-hour switch overrides the locale's default clock, which Intl can't see.
export function formatTime(epochMs: number, languageTag: string, uses24HourClock: boolean) {
  return new Intl.DateTimeFormat(languageTag, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: uses24HourClock ? "h23" : "h12",
  }).format(epochMs);
}
