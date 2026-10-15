import type { ProgressStation } from "@/db/progress";
import type { I18n } from "@/lib/i18n";

// Stations of every Gym share one list, so each reads by its Gym first.
export function stationName({ gymName, label, retired }: ProgressStation, { t }: I18n) {
  const name = t.exerciseDetail.station(gymName, label);
  return retired ? t.exerciseDetail.retired(name) : name;
}
