import type { ProgressStation } from "@/db/progress";

export type StationSwitcherProps = {
  stations: ProgressStation[];
  current: ProgressStation;
  onSwitch: (stationId: string) => void;
};
