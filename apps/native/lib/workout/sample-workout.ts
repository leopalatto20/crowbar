import {
  type LoggedSet,
  type Performance,
  type SetKind,
  type WorkoutExercise,
  makeSetId,
} from "./model";

// Stands in for the persisted Workout until the data layer exists.
export const SAMPLE_WORKOUT = {
  routine: "Upper A",
  gym: "Downtown Iron",
  startedAt: "6:42 PM",
};

function sets(kinds: SetKind[], previous: (Performance | null)[]): LoggedSet[] {
  return kinds.map((kind, i) => ({
    id: makeSetId(),
    kind,
    weight: null,
    reps: null,
    rir: null,
    done: false,
    previous: previous[i] ?? null,
  }));
}

export function sampleExercises(): WorkoutExercise[] {
  return [
    {
      id: "bench",
      name: "Barbell Bench Press",
      shortName: "Bench",
      stationLabel: null,
      unit: "kg",
      notes: "Bench 3 · J-hooks at hole 7 · safeties at 4",
      target: { sets: 3, repMin: 5, repMax: 7, rirMin: 1, rirMax: 2 },
      restSeconds: 180,
      sets: sets(
        ["warmup", "warmup", "working", "working", "working"],
        [
          { weight: 60, reps: 8, rir: null },
          { weight: 80, reps: 4, rir: null },
          { weight: 100, reps: 7, rir: 2 },
          { weight: 100, reps: 6, rir: 1 },
          { weight: 100, reps: 5, rir: 1 },
        ],
      ),
    },
    {
      id: "chest-press",
      name: "Machine Chest Press",
      shortName: "Chest Press",
      stationLabel: "Hammer Strength",
      unit: "kg",
      notes: "Seat 5 · neutral handles · plates both sides",
      target: { sets: 3, repMin: 8, repMax: 10, rirMin: 1, rirMax: 1 },
      restSeconds: 150,
      sets: sets(
        ["working", "working", "working"],
        [
          { weight: 45, reps: 10, rir: 1 },
          { weight: 45, reps: 9, rir: 1 },
          { weight: 45, reps: 8, rir: 0 },
        ],
      ),
    },
    {
      id: "cable-row",
      name: "Seated Cable Row",
      shortName: "Cable Row",
      stationLabel: null,
      unit: "level",
      notes: "Stack is unlabeled · V-handle · foot plate low",
      target: { sets: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 2 },
      restSeconds: 120,
      sets: sets(
        ["working", "working", "working"],
        [
          { weight: 12, reps: 12, rir: 2 },
          { weight: 12, reps: 11, rir: 1 },
          { weight: 12, reps: 10, rir: 1 },
        ],
      ),
    },
    {
      id: "lateral-raise",
      name: "Dumbbell Lateral Raise",
      shortName: "Lateral Raise",
      stationLabel: null,
      unit: "kg",
      notes: null,
      target: { sets: 3, repMin: 12, repMax: 15, rirMin: 0, rirMax: 1 },
      restSeconds: 90,
      sets: sets(
        ["working", "working", "working"],
        [
          { weight: 12, reps: 14, rir: 1 },
          { weight: 12, reps: 13, rir: 1 },
          { weight: 12, reps: 12, rir: 0 },
        ],
      ),
    },
  ];
}
