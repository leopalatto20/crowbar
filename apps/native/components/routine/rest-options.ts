import { REST_PRESETS } from "@/lib/routine/model";

// A rest value from outside the presets still has to be listed to show as the current one.
export function restOptions(seconds: number) {
  return REST_PRESETS.includes(seconds)
    ? REST_PRESETS
    : [...REST_PRESETS, seconds].sort((a, b) => a - b);
}
