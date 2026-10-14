import type { BuiltInExercise } from ".";

export const SIDE_DELTS: BuiltInExercise[] = [
  {
    id: "dumbbell-lateral-raise",
    name: { en: "Dumbbell Lateral Raise", es: "Elevación lateral con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
  {
    id: "cable-single-arm-lateral-raise",
    name: { en: "Cable Single-Arm Lateral Raise", es: "Elevación lateral a una mano en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: true,
    muscleGroup: "sideDelts",
  },
  {
    id: "machine-lateral-raise",
    name: { en: "Machine Lateral Raise", es: "Elevación lateral en máquina" },
    equipmentType: "machine",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
  {
    id: "barbell-upright-row",
    name: { en: "Barbell Upright Row", es: "Remo al mentón con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
  {
    id: "cable-upright-row",
    name: { en: "Cable Upright Row", es: "Remo al mentón en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
  {
    id: "cable-y-raise",
    name: { en: "Cable Y-Raise", es: "Elevación en Y en polea" },
    equipmentType: "cable",
    loadType: "external",
    unilateral: false,
    muscleGroup: "sideDelts",
  },
];
