import type { EquipmentType, LoadType, MuscleGroup } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";

import { ABDUCTORS } from "./abductors";
import { ABS } from "./abs";
import { ADDUCTORS } from "./adductors";
import { BICEPS } from "./biceps";
import { CALVES } from "./calves";
import { CHEST } from "./chest";
import { FOREARMS } from "./forearms";
import { FRONT_DELTS } from "./front-delts";
import { GLUTES } from "./glutes";
import { HAMSTRINGS } from "./hamstrings";
import { LATS } from "./lats";
import { LOWER_BACK } from "./lower-back";
import { QUADS } from "./quads";
import { REAR_DELTS } from "./rear-delts";
import { SIDE_DELTS } from "./side-delts";
import { TRICEPS } from "./triceps";
import { UPPER_BACK } from "./upper-back";

// The seed format for Built-in Exercises. Every launch inserts the entries a database doesn't
// have yet (seedBuiltInExercises), so a new app version adds its new entries and changes nothing else:
// - `id` is a Crowbar-owned kebab-case slug, permanent once shipped. Sets, Stations and Routines
//   point at it, so it is never changed, reused or removed.
// - `name` needs every shipped language, unique case-insensitively within each language.
// - Every field is fixed once shipped: names must stay unique alongside Custom Exercises, and the
//   other fields would reinterpret history. Correcting one means a new entry with a new id.
//
// Curation rules (#25), so later additions stay consistent with the shipped list:
// - Scope: resistance work logged as load x reps. No Olympic lifts, carries, timed holds,
//   plyometrics or cardio. Band entries are only band-assisted lifts (#12).
// - A variation gets its own entry only when it changes the load lifters can move or the muscle
//   trained (incline, close-grip, paused, pin). Grip, stance, tempo and attachment tweaks don't.
//   Names are generic: brand and machine-design differences belong to Stations.
// - English names lead with the equipment ("Dumbbell Incline Press"). Bodyweight lifts drop it
//   ("Pull-Up"); Landmine, T-Bar and Smith Machine lead with the word lifters use. `id` is the
//   English name in kebab case.
// - Spanish names use Latin American gym usage, Mexican where it diverges, keeping the loanwords
//   gyms use ("Press", "Curl", "Hip thrust"). Equipment comes last ("Press inclinado con
//   mancuernas"). Singular, unless gyms only use the plural ("Fondos", "Aperturas").
// - Unilateral when one side works at a time and reps count per side. A unilateral version of a
//   bilateral lift says "Single-Arm" or "Single-Leg"; lifts that are one-sided by nature (split
//   squat, kickback) don't. No "Alternating" entries: they are the bilateral lift.
// - One Muscle group, the primary mover: deadlifts are lowerBack, rows upperBack, pulldowns and
//   pullovers lats, shrugs upperBack, dips and close-grip or lockout presses triceps.
export type BuiltInExercise = {
  id: string;
  name: Record<Language, string>;
  equipmentType: EquipmentType;
  loadType: LoadType;
  unilateral: boolean;
  muscleGroup: MuscleGroup;
};

export const BUILT_IN_EXERCISES: BuiltInExercise[] = [
  ...CHEST,
  ...LATS,
  ...UPPER_BACK,
  ...LOWER_BACK,
  ...FRONT_DELTS,
  ...SIDE_DELTS,
  ...REAR_DELTS,
  ...BICEPS,
  ...TRICEPS,
  ...FOREARMS,
  ...ABS,
  ...QUADS,
  ...HAMSTRINGS,
  ...GLUTES,
  ...ADDUCTORS,
  ...ABDUCTORS,
  ...CALVES,
];
