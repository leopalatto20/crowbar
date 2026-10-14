import { describe, expect, test } from "bun:test";

import { inferExerciseFields } from "./infer";

describe("inferExerciseFields", () => {
  test("a name with no hints gets Other, External and bilateral", () => {
    expect(inferExerciseFields("Pendlay row", {})).toEqual({
      equipmentType: "other",
      loadType: "external",
      unilateral: false,
    });
  });

  test.each([
    ["Cable fly", "cable"],
    ["DB row", "dumbbell"],
    ["dumbbell curl", "dumbbell"],
    ["BB squat", "barbell"],
    ["Smith machine squat", "smithMachine"],
    ["Smith squat", "smithMachine"],
    ["EZ bar curl", "ezBar"],
    ["EZ-bar skull crusher", "ezBar"],
    ["Trap bar deadlift", "trapBar"],
    ["Hex bar deadlift", "trapBar"],
    ["KB swing", "kettlebell"],
    ["Band pull-apart", "band"],
    ["Machine chest press", "machine"],
  ] as const)("“%s” leads with an equipment word: %s", (name, equipmentType) => {
    expect(inferExerciseFields(name, {}).equipmentType).toBe(equipmentType);
  });

  test("“Assisted” makes it Assisted", () => {
    expect(inferExerciseFields("Assisted dip", {})).toMatchObject({
      equipmentType: "other",
      loadType: "assisted",
    });
    expect(inferExerciseFields("Machine assisted pull-up", {})).toMatchObject({
      equipmentType: "machine",
      loadType: "assisted",
    });
  });

  test("“Band assisted” is Band equipment with Assisted load", () => {
    expect(inferExerciseFields("Band assisted pull-up", {})).toMatchObject({
      equipmentType: "band",
      loadType: "assisted",
    });
  });

  test("Band alone stays External", () => {
    expect(inferExerciseFields("Band pull-apart", {}).loadType).toBe("external");
  });

  test.each(["Single-arm row", "single arm cable row", "Single-leg RDL", "Unilateral leg press"])(
    "“%s” is unilateral",
    (name) => {
      expect(inferExerciseFields(name, {}).unilateral).toBe(true);
    },
  );

  test("a unilateral or assisted word before the equipment word still finds the equipment", () => {
    expect(inferExerciseFields("Single-arm DB row", {})).toMatchObject({
      equipmentType: "dumbbell",
      unilateral: true,
    });
    expect(inferExerciseFields("Assisted machine dip", {})).toMatchObject({
      equipmentType: "machine",
      loadType: "assisted",
    });
  });

  test("Bodyweight equipment defaults load type to Bodyweight", () => {
    expect(inferExerciseFields("Bodyweight lunge", {})).toEqual({
      equipmentType: "bodyweight",
      loadType: "bodyweight",
      unilateral: false,
    });
  });

  test("a touched field keeps the lifter's value whatever the name says", () => {
    expect(
      inferExerciseFields("Single-arm assisted cable row", {
        equipmentType: "machine",
        loadType: "external",
        unilateral: false,
      }),
    ).toEqual({ equipmentType: "machine", loadType: "external", unilateral: false });
  });

  test("untouched fields are still inferred next to a touched one", () => {
    expect(inferExerciseFields("Single-arm cable row", { equipmentType: "machine" })).toEqual({
      equipmentType: "machine",
      loadType: "external",
      unilateral: true,
    });
  });

  test("choosing Bodyweight equipment defaults an untouched load type to Bodyweight", () => {
    expect(inferExerciseFields("Dip", { equipmentType: "bodyweight" }).loadType).toBe("bodyweight");
    expect(
      inferExerciseFields("Dip", { equipmentType: "bodyweight", loadType: "external" }).loadType,
    ).toBe("external");
  });

  test("choosing other equipment drops the Bodyweight default", () => {
    expect(inferExerciseFields("Bodyweight dip", { equipmentType: "machine" }).loadType).toBe(
      "external",
    );
  });

  test("only a leading equipment word counts", () => {
    expect(inferExerciseFields("Lat pulldown on cable", {}).equipmentType).toBe("other");
    expect(inferExerciseFields("Dbx row", {}).equipmentType).toBe("other");
  });
});
