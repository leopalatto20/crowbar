import type { BuiltInExercise } from ".";

export const FOREARMS: BuiltInExercise[] = [
  {
    id: "barbell-wrist-curl",
    name: { en: "Barbell Wrist Curl", es: "Curl de muñeca con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "forearms",
  },
  {
    id: "barbell-reverse-wrist-curl",
    name: { en: "Barbell Reverse Wrist Curl", es: "Curl de muñeca invertido con barra" },
    equipmentType: "barbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "forearms",
  },
  {
    id: "dumbbell-wrist-curl",
    name: { en: "Dumbbell Wrist Curl", es: "Curl de muñeca con mancuernas" },
    equipmentType: "dumbbell",
    loadType: "external",
    unilateral: false,
    muscleGroup: "forearms",
  },
  {
    id: "ez-bar-reverse-curl",
    name: { en: "EZ Bar Reverse Curl", es: "Curl invertido con barra Z" },
    equipmentType: "ezBar",
    loadType: "external",
    unilateral: false,
    muscleGroup: "forearms",
  },
];
