import { describe, expect, test } from "bun:test";

import { move } from "./model";

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
