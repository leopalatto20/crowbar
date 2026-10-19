import type { MenuHintProps } from "@/components/menu-hint.types";
import type { ExerciseListing } from "@/db/exercises";

export type ExerciseSection = { key: string; title: string; listings: ExerciseListing[] };

// A tap opens Exercise detail. Every Exercise offers Hide or Unhide; only a Custom Exercise can
// also be edited or deleted.
export type ExerciseActions = {
  onOpen: (listing: ExerciseListing) => void;
  onEdit: (listing: ExerciseListing) => void;
  onToggleHidden: (listing: ExerciseListing) => void;
  onDelete: (listing: ExerciseListing) => void;
};

export type ExerciseListProps = MenuHintProps &
  ExerciseActions & {
    sections: ExerciseSection[];
    // The row at the bottom that leads to the Hidden Exercises; left out while none are hidden.
    onOpenHidden?: () => void;
  };
