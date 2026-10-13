import type { EquipmentType, LoadType, MuscleGroup } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";

// The seed format for Built-in Exercises. Every launch upserts this list (seedBuiltInExercises),
// so a new app version adds its new entries and refreshes names, and nothing else changes:
// - `id` is a Crowbar-owned kebab-case slug, permanent once shipped. Sets, Stations and Routines
//   point at it, so it is never changed, reused or removed; a renamed lift keeps its id.
// - `name` needs every shipped language, unique case-insensitively within each language.
// - The other fields are fixed once shipped, because changing them would reinterpret history.
//   Correcting one means a new entry with a new id.
export type BuiltInExercise = {
  id: string;
  name: Record<Language, string>;
  equipmentType: EquipmentType;
  loadType: LoadType;
  unilateral: boolean;
  muscleGroup: MuscleGroup;
};

// A starter set; #25 curates the full list.
export const BUILT_IN_EXERCISES: BuiltInExercise[] = [
  {
    id: "barbell-bench-press",
    name: { en: "Barbell Bench Press", es: "Press de banca con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "chest",
  },
  {
    id: "incline-dumbbell-press",
    name: { en: "Incline Dumbbell Press", es: "Press inclinado con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "chest",
  },
  {
    id: "machine-chest-press",
    name: { en: "Machine Chest Press", es: "Press de pecho en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "chest",
  },
  {
    id: "cable-fly",
    name: { en: "Cable Fly", es: "Aperturas en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "chest",
  },
  {
    id: "pull-up",
    name: { en: "Pull-Up", es: "Dominada" },
    equipmentType: "bodyweight",
    loadType: "bodyweight",
    unilateral: false,
    muscleGroup: "lats",
  },
  {
    id: "machine-assisted-pull-up",
    name: { en: "Machine Assisted Pull-Up", es: "Dominada asistida en máquina" },
    equipmentType: "machine",
    loadType: "assisted",
    unilateral: false,
    muscleGroup: "lats",
  },
  {
    id: "cable-lat-pulldown",
    name: { en: "Cable Lat Pulldown", es: "Jalón al pecho en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "lats",
  },
  {
    id: "seated-cable-row",
    name: { en: "Seated Cable Row", es: "Remo sentado en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "upperBack",
  },
  {
    id: "chest-supported-dumbbell-row",
    name: {
      en: "Chest-Supported Dumbbell Row",
      es: "Remo con mancuernas con apoyo en el pecho",
    },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "upperBack",
  },
  {
    id: "dumbbell-lateral-raise",
    name: { en: "Dumbbell Lateral Raise", es: "Elevación lateral con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
  {
    id: "single-arm-cable-lateral-raise",
    name: {
      en: "Single-Arm Cable Lateral Raise",
      es: "Elevación lateral a una mano en polea",
    },
    equipmentType: "cable",
    loadType: "external",
    unilateral: true,
    muscleGroup: "sideDelts",
  },
  {
    id: "machine-reverse-pec-deck",
    name: { en: "Machine Reverse Pec Deck", es: "Pec deck invertido en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "rearDelts",
  },
  {
    id: "ez-bar-curl",
    name: { en: "EZ Bar Curl", es: "Curl con barra Z" },
    equipmentType: "ezBar",
    loadType: "external",
    unilateral: false,
    muscleGroup: "biceps",
  },
  {
    id: "cable-triceps-pushdown",
    name: { en: "Cable Triceps Pushdown", es: "Extensión de tríceps en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "triceps",
  },
  {
    id: "cable-overhead-triceps-extension",
    name: {
      en: "Cable Overhead Triceps Extension",
      es: "Extensión de tríceps sobre la cabeza en polea",
    },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "triceps",
  },
  {
    id: "dip",
    name: { en: "Dip", es: "Fondos" },
    equipmentType: "bodyweight",
    loadType: "bodyweight",
    unilateral: false,
    muscleGroup: "triceps",
  },
  {
    id: "cable-crunch",
    name: { en: "Cable Crunch", es: "Crunch en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "abs",
  },
  {
    id: "barbell-back-squat",
    name: { en: "Barbell Back Squat", es: "Sentadilla trasera con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "quads",
  },
  {
    id: "machine-hack-squat",
    name: { en: "Machine Hack Squat", es: "Sentadilla hack en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "quads",
  },
  {
    id: "machine-leg-extension",
    name: { en: "Machine Leg Extension", es: "Extensión de cuádriceps en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "quads",
  },
  {
    id: "dumbbell-bulgarian-split-squat",
    name: { en: "Dumbbell Bulgarian Split Squat", es: "Sentadilla búlgara con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: true,
    muscleGroup: "quads",
  },
  {
    id: "barbell-romanian-deadlift",
    name: { en: "Barbell Romanian Deadlift", es: "Peso muerto rumano con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "hamstrings",
  },
  {
    id: "machine-seated-leg-curl",
    name: { en: "Machine Seated Leg Curl", es: "Curl femoral sentado en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "hamstrings",
  },
  {
    id: "barbell-hip-thrust",
    name: { en: "Barbell Hip Thrust", es: "Hip thrust con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "glutes",
  },
  {
    id: "machine-standing-calf-raise",
    name: { en: "Machine Standing Calf Raise", es: "Elevación de talones de pie en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "calves",
  },
];
