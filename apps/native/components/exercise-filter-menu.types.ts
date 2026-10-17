import type { ExerciseFilters } from "@/lib/exercise/model";

// The picker's filter menu, which also offers Muscle group since only the Exercises tab has
// Muscle group sections. `doneLabel` names where Done reads history; null leaves Done out.
export type ExerciseFilterMenuProps = {
  filters: ExerciseFilters;
  doneLabel: string | null;
  onChange: (filters: ExerciseFilters) => void;
};
