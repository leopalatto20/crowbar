import type { RoutineListing } from "@/db/routines";

export type RoutineListProps = {
  // Names already fall back to "New Routine" when blank.
  routines: RoutineListing[];
  editing: boolean;
  onStartEmptyWorkout: () => void;
  onStart: (id: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (routine: RoutineListing) => void;
  onDelete: (routine: RoutineListing) => void;
  onReorder: (ids: string[]) => void;
};
