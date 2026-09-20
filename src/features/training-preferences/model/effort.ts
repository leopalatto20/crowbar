export type EffortMetric = "rpe" | "rir";

const effortRanges: Record<EffortMetric, readonly [number, number]> = {
  rpe: [5, 10],
  rir: [0, 5],
};

export function isValidEffort(metric: EffortMetric, value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const [minimum, maximum] = effortRanges[metric];

  return value >= minimum && value <= maximum && Number.isInteger(value * 2);
}

export function convertEffort(
  value: number,
  from: EffortMetric,
  to: EffortMetric,
): number {
  return from === to ? value : 10 - value;
}
