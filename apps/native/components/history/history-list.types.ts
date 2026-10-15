import type { HistoryMonth } from "@/db/workouts";

export type HistoryListProps = {
  months: HistoryMonth[];
  onOpen: (workoutId: string) => void;
};
