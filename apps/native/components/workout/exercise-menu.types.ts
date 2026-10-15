import type { StationOption } from "@/db/workouts";

// Switch Station only appears once the Exercise has a Station at this Gym; before that there's
// nothing to switch.
export type ExerciseMenuProps = {
  name: string;
  stations: StationOption[];
  currentStationId: string | null;
  hasNotes: boolean;
  onSwitchStation: (stationId: string) => void;
  onNewStation: () => void;
  onEditNotes: () => void;
};
