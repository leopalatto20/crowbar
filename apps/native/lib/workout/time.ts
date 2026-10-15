// A date and time as a clock on the wall reads it in some time zone; `month` runs 1-12.
export type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

export function wallClockOf(epochMs: number, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    // h23, not hour12: false, which some engines read as midnight "24".
    hourCycle: "h23",
  }).formatToParts(epochMs);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
  };
}

// The zone's offset can differ on either side of a daylight-saving change, so it's read again at
// the first guess. A wall clock skipped by a change resolves to just after it.
export function epochOf(wall: WallClock, timeZone: string) {
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const guess = asUtc - offsetAt(asUtc, timeZone);
  return asUtc - offsetAt(guess, timeZone);
}

function offsetAt(epochMs: number, timeZone: string) {
  const wall = wallClockOf(epochMs, timeZone);
  const minuteStart = epochMs - (epochMs % 60_000);
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute) - minuteStart;
}

// Native date pickers read and write the device's zone, so a Workout's wall clock is shown as the
// same wall clock there, and read back the same way.
export function pickerDateOf(wall: WallClock) {
  return new Date(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
}

export function wallClockOfPickerDate(date: Date): WallClock {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

// A new Workout is stored in the zone the device is in, so its times read as they did there.
export function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
