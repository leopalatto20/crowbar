import type { BuiltInExercise } from ".";

export const CALVES: BuiltInExercise[] = [
  {
    id: "machine-standing-calf-raise",
    name: { en: "Machine Standing Calf Raise", es: "Elevación de pantorrilla de pie en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "calves",
  },
  {
    id: "machine-seated-calf-raise",
    name: { en: "Machine Seated Calf Raise", es: "Elevación de pantorrilla sentado en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "calves",
  },
  {
    id: "machine-leg-press-calf-raise",
    name: { en: "Machine Leg Press Calf Raise", es: "Elevación de pantorrilla en prensa" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "calves",
  },
  {
    id: "smith-machine-calf-raise",
    name: { en: "Smith Machine Calf Raise", es: "Elevación de pantorrilla en máquina Smith" },
    equipmentType: "smithMachine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "calves",
  },
  {
    id: "dumbbell-single-leg-calf-raise",
    name: {
      en: "Dumbbell Single-Leg Calf Raise",
      es: "Elevación de pantorrilla a una pierna con mancuerna",
    },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: true,
    muscleGroup: "calves",
  },
];
