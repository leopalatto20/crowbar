import type { BuiltInExercise } from ".";

export const ABDUCTORS: BuiltInExercise[] = [
  {
    id: "machine-hip-abduction",
    name: { en: "Machine Hip Abduction", es: "Abducción de cadera en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "abductors",
  },
  {
    id: "cable-hip-abduction",
    name: { en: "Cable Hip Abduction", es: "Abducción de cadera en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: true,
    muscleGroup: "abductors",
  },
];
