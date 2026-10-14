import type { BuiltInExercise } from ".";

export const ADDUCTORS: BuiltInExercise[] = [
  {
    id: "machine-hip-adduction",
    name: { en: "Machine Hip Adduction", es: "Aducción de cadera en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "adductors",
  },
  {
    id: "cable-hip-adduction",
    name: { en: "Cable Hip Adduction", es: "Aducción de cadera en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: true,
    muscleGroup: "adductors",
  },
];
