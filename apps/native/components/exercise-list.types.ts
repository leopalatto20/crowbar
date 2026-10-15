import type { ExerciseListing } from "@/db/exercises";

export type ExerciseSection = { key: string; title: string; listings: ExerciseListing[] };

// Every Exercise offers Hide or Unhide; only a Custom Exercise can also be edited or deleted.
export type ExerciseListProps = {
  sections: ExerciseSection[];
  // The row at the bottom that leads to the Hidden Exercises; left out while none are hidden.
  onOpenHidden?: () => void;
  onEdit: (listing: ExerciseListing) => void;
  onToggleHidden: (listing: ExerciseListing) => void;
  onDelete: (listing: ExerciseListing) => void;
};
