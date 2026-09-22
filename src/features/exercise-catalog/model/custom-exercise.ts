import type { MuscleGroup } from "./catalog";

export type CustomExerciseInput = Readonly<{
  displayName: string;
  muscleGroup: MuscleGroup;
}>;

export type CustomExerciseNameFailure = "blank" | "too-long" | "invalid-characters";

export type ParsedCustomExerciseName = Readonly<{
  displayName: string;
  nameKey: string;
}>;

export type CustomExerciseNameResult =
  | Readonly<{ ok: true; value: ParsedCustomExerciseName }>
  | Readonly<{ ok: false; reason: CustomExerciseNameFailure }>;

export function parseCustomExerciseName(input: string): CustomExerciseNameResult {
  const displayName = input.trim();

  if (displayName.length === 0) {
    return { ok: false, reason: "blank" };
  }

  if (Array.from(displayName).length > 80) {
    return { ok: false, reason: "too-long" };
  }

  if (/[\p{Cc}\p{Cf}]/u.test(displayName)) {
    return { ok: false, reason: "invalid-characters" };
  }

  return {
    ok: true,
    value: {
      displayName,
      nameKey: displayName.normalize("NFC").toLocaleLowerCase("en-US"),
    },
  };
}
