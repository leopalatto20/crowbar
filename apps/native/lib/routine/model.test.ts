import { describe, expect, test } from "bun:test";

import { ageOf, move } from "./model";

describe("move", () => {
  const ids = ["a", "b", "c", "d"];

  test("moving down lands before the row at the destination offset", () => {
    expect(move(ids, [0], 2)).toEqual(["b", "a", "c", "d"]);
  });

  test("moving up lands at the destination offset", () => {
    expect(move(ids, [3], 0)).toEqual(["d", "a", "b", "c"]);
  });

  test("an offset past the last row moves to the end", () => {
    expect(move(ids, [0], 4)).toEqual(["b", "c", "d", "a"]);
  });

  test("several rows keep their relative order", () => {
    expect(move(ids, [1, 3], 0)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("ageOf", () => {
  const now = new Date(2026, 9, 14, 8, 0).getTime();
  const at = (day: number, hour = 20) => new Date(2026, 9, day, hour, 0).getTime();

  test("counts calendar days, so last night is yesterday this morning", () => {
    expect(ageOf(at(14, 6), now)).toEqual({ unit: "day", count: 0 });
    expect(ageOf(at(13, 23), now)).toEqual({ unit: "day", count: 1 });
    expect(ageOf(at(11), now)).toEqual({ unit: "day", count: 3 });
  });

  test("rounds down to whole weeks, months and years as the gap grows", () => {
    expect(ageOf(at(7), now)).toEqual({ unit: "week", count: 1 });
    expect(ageOf(new Date(2026, 8, 1).getTime(), now)).toEqual({ unit: "month", count: 1 });
    expect(ageOf(new Date(2024, 9, 1).getTime(), now)).toEqual({ unit: "year", count: 2 });
  });
});
