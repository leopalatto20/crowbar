import type { EquipmentType, LoadType } from "./model";

export type InferredFields = {
  equipmentType: EquipmentType;
  loadType: LoadType;
  unilateral: boolean;
};

// Longer words first, so "Smith machine" wins over "Smith" and "EZ bar" over "EZ".
const EQUIPMENT_WORDS: [RegExp, EquipmentType][] = [
  [/^smith( machine)?\b/, "smithMachine"],
  [/^ez[- ]?bar\b/, "ezBar"],
  [/^(trap|hex)[- ]?bar\b/, "trapBar"],
  [/^(barbell|bb)\b/, "barbell"],
  [/^(dumbbell|db)\b/, "dumbbell"],
  [/^machine\b/, "machine"],
  [/^cable\b/, "cable"],
  [/^(kettlebell|kb)\b/, "kettlebell"],
  [/^band\b/, "band"],
  [/^(bodyweight|bw)\b/, "bodyweight"],
];

const ASSISTED = /\bassisted\b/;
const UNILATERAL = /\b(single[- ](arm|leg)|unilateral)\b/;
// "Single-arm DB row" still names its equipment first once the side and assistance words are set aside.
const LEADING_MODIFIERS = /^((single[- ](arm|leg)|unilateral|assisted)\s+)+/;

function leadingEquipment(name: string) {
  const rest = name.replace(LEADING_MODIFIERS, "");
  return EQUIPMENT_WORDS.find(([word]) => word.test(rest))?.[1];
}

function inferLoadType(name: string, equipmentType: EquipmentType): LoadType {
  if (ASSISTED.test(name)) return "assisted";
  if (equipmentType === "bodyweight") return "bodyweight";
  return "external";
}

// `touched` holds the fields the lifter has set by hand: they are returned as is and never
// re-inferred, while every other field follows the name as it is typed.
export function inferExerciseFields(
  name: string,
  touched: Partial<InferredFields>,
): InferredFields {
  const normalized = name.trim().toLowerCase();
  const equipmentType = touched.equipmentType ?? leadingEquipment(normalized) ?? "other";
  return {
    equipmentType,
    loadType: touched.loadType ?? inferLoadType(normalized, equipmentType),
    unilateral: touched.unilateral ?? UNILATERAL.test(normalized),
  };
}
