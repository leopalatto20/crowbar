import type { MenuHintProps } from "@/components/menu-hint.types";
import type { RoutineListing } from "@/db/routines";

export type RoutineListProps = MenuHintProps & {
  // Names already fall back to "New Routine" when blank.
  routines: RoutineListing[];
  editing: boolean;
  onStartEmptyWorkout: () => void;
  onStart: (id: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onShare: (routine: RoutineListing) => void;
  onDuplicate: (routine: RoutineListing) => void;
  onDelete: (routine: RoutineListing) => void;
  onReorder: (ids: string[]) => void;
};
