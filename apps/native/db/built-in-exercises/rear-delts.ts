import type { BuiltInExercise } from ".";

export const REAR_DELTS: BuiltInExercise[] = [
  {
    id: "machine-reverse-pec-deck",
    name: { en: "Machine Reverse Pec Deck", es: "Pec deck invertido en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "rearDelts",
  },
  {
    id: "cable-face-pull",
    name: { en: "Cable Face Pull", es: "Face pull en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "rearDelts",
  },
  {
    id: "cable-reverse-fly",
    name: { en: "Cable Reverse Fly", es: "Aperturas invertidas en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "rearDelts",
  },
  {
    id: "dumbbell-reverse-fly",
    name: { en: "Dumbbell Reverse Fly", es: "Aperturas invertidas con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "rearDelts",
  },
  {
    id: "cable-single-arm-reverse-fly",
    name: { en: "Cable Single-Arm Reverse Fly", es: "Aperturas invertidas a una mano en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: true,
    muscleGroup: "rearDelts",
  },
];
