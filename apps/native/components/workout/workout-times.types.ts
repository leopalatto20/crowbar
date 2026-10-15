import type { WallClock } from "@/lib/workout/time";

// The pickers bound the start only as of when they opened, and Android's time dialog can't bound
// it at all, so `onChangeStart` may still receive a start later than now.
export type WorkoutTimesProps = {
  startedAt: number;
  finishedAt: number;
  timeZone: string;
  onChangeStart: (start: WallClock) => void;
  onChangeDuration: (minutes: number) => void;
};
