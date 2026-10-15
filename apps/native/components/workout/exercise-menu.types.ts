import type { StationOption } from "@/db/workouts";

// Switch Station only appears once the Exercise has a Station at this Gym; before that there's
// nothing to switch. Swap is disabled once a set is confirmed, since logged sets never move
// between Exercises.
export type ExerciseMenuProps = {
  name: string;
  stations: StationOption[];
  currentStationId: string | null;
  hasNotes: boolean;
  canSwap: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSwitchStation: (stationId: string) => void;
  onNewStation: () => void;
  onEditNotes: () => void;
  onSwap: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};
