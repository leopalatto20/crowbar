import { describe, expect, test } from "bun:test";

import { restActivityStep, restLink, restWorkoutExerciseOfLink } from "./rest-activity";

describe("Rest link", () => {
  test("opens the Ledger at the Exercise it was made for", () => {
    expect(restWorkoutExerciseOfLink(restLink("we-1"))).toBe("we-1");
  });

  test("survives ids with characters a URL reserves", () => {
    expect(restWorkoutExerciseOfLink(restLink("a&b=c/d?"))).toBe("a&b=c/d?");
  });

  test("ignores links that aren't a Rest's", () => {
    expect(restWorkoutExerciseOfLink("crowbar://workout")).toBeNull();
    expect(restWorkoutExerciseOfLink("https://example.com/rest?workoutExerciseId=we-1")).toBeNull();
    expect(restWorkoutExerciseOfLink(null)).toBeNull();
  });
});

describe("Live Activity step", () => {
  const benchRest = { workoutExerciseId: "bench", endsAt: 10_000 };

  test("starts one for a Rest that isn't shown yet", () => {
    expect(restActivityStep(null, benchRest, 0)).toBe("start");
  });

  test("updates the one shown when its Exercise rests again or is adjusted", () => {
    expect(restActivityStep("bench", benchRest, 0)).toBe("update");
  });

  test("starts over when the Rest is replaced by another Exercise's, whose link differs", () => {
    expect(restActivityStep("squat", benchRest, 0)).toBe("start");
  });

  test("ends it once no Rest runs: cancelled, skipped, finished or discarded", () => {
    expect(restActivityStep("bench", null, 0)).toBe("end");
  });

  test("ends it once the Rest reaches zero in front of the lifter", () => {
    expect(restActivityStep("bench", benchRest, 10_000)).toBe("end");
  });
});
