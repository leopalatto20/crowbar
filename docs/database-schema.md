# Database Schema

Status: accepted for implementation.

This document records Crowbar's approved normalized SQLite structure. It applies the vocabulary in [`CONTEXT.md`](../CONTEXT.md) and the business rules indexed by [`docs/domain-rules.md`](domain-rules.md).

The [interactive schema diagram](database-schema-diagram.html) is the approved visual companion to this document.

## Model

Crowbar stores two distinct relational graphs:

```text
Mutable planning
trainee -> routine -> movement_prescription -> prescribed_set

Immutable history
workout -> workout_movement_prescription -> workout_prescribed_set
                                      |
                                      -> performed_set -> machine -> gym
```

Starting a workout copies the complete current prescription into the workout-owned snapshot graph in one transaction. Historical queries never read current routine prescriptions or the trainee's current effort setting.

## Conventions

- Use application-generated `TEXT` identifiers suitable for future export, restore, and synchronization.
- Store timestamps as UTC Unix milliseconds in `INTEGER` columns.
- Enable `PRAGMA foreign_keys = ON` for every database connection.
- Enable `PRAGMA journal_mode = WAL` when initializing the database.
- Use `STRICT` tables.
- Archive referenced domain records with `archived_at`; do not physically delete data that gives workout history its meaning.
- Treat lookup codes as stable persisted identifiers, not localized display text.
- Keep user-facing labels in localization resources rather than the database.

## Reference Data

```sql
CREATE TABLE effort_metrics (
  code TEXT PRIMARY KEY
) STRICT;

INSERT INTO effort_metrics (code) VALUES ('rpe'), ('rir');

CREATE TABLE load_representations (
  code TEXT PRIMARY KEY
) STRICT;

INSERT INTO load_representations (code)
VALUES ('kilograms'), ('pounds'), ('plate_count');
```

New lookup values require corresponding domain behavior and an explicit migration. The lookup tables permit extension without accepting arbitrary unvalidated strings.

## Planning Tables

```sql
CREATE TABLE trainees (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  current_effort_metric_code TEXT NOT NULL
    REFERENCES effort_metrics(code) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;

CREATE TABLE gyms (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL
    REFERENCES trainees(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;

CREATE TABLE movements (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL
    REFERENCES trainees(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;

CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL
    REFERENCES trainees(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;

CREATE TABLE movement_prescriptions (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL
    REFERENCES routines(id) ON DELETE CASCADE,
  movement_id TEXT NOT NULL
    REFERENCES movements(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  instructions TEXT,
  UNIQUE (routine_id, position)
) STRICT;

CREATE TABLE prescribed_sets (
  id TEXT PRIMARY KEY,
  movement_prescription_id TEXT NOT NULL
    REFERENCES movement_prescriptions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  target_repetitions_min INTEGER
    CHECK (target_repetitions_min >= 0),
  target_repetitions_max INTEGER
    CHECK (target_repetitions_max >= 0),
  target_effort_metric_code TEXT
    REFERENCES effort_metrics(code) ON DELETE RESTRICT,
  target_effort_min REAL,
  target_effort_max REAL,
  UNIQUE (movement_prescription_id, position),
  CHECK (
    target_repetitions_min IS NULL
    OR target_repetitions_max IS NULL
    OR target_repetitions_max >= target_repetitions_min
  ),
  CHECK (
    (
      target_effort_metric_code IS NULL
      AND target_effort_min IS NULL
      AND target_effort_max IS NULL
    )
    OR
    (
      target_effort_metric_code IS NOT NULL
      AND (target_effort_min IS NOT NULL OR target_effort_max IS NOT NULL)
    )
  ),
  CHECK (
    target_effort_min IS NULL
    OR target_effort_max IS NULL
    OR target_effort_max >= target_effort_min
  )
) STRICT;
```

The number of prescribed sets is the number of `prescribed_sets` rows. Do not also persist a target set count.

Routine tables contain no gym, machine, or load-representation references. This keeps routine maintenance centralized across gyms.

## Machine Tables

```sql
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  gym_id TEXT NOT NULL
    REFERENCES gyms(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  load_representation_code TEXT NOT NULL
    REFERENCES load_representations(code) ON DELETE RESTRICT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;
```

A machine is a trainee-managed comparable history, not necessarily one physical apparatus. Its gym and load representation are immutable. Splitting equipment, attaching a non-comparable replacement, moving to another gym, or changing load representation creates a new machine row.

## Workout Snapshot Tables

```sql
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL
    REFERENCES routines(id) ON DELETE RESTRICT,
  gym_id TEXT NOT NULL
    REFERENCES gyms(id) ON DELETE RESTRICT,
  routine_name_snapshot TEXT NOT NULL,
  effort_metric_code TEXT NOT NULL
    REFERENCES effort_metrics(code) ON DELETE RESTRICT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER
) STRICT;

CREATE TABLE workout_movement_prescriptions (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL
    REFERENCES workouts(id) ON DELETE RESTRICT,
  movement_id TEXT NOT NULL
    REFERENCES movements(id) ON DELETE RESTRICT,
  movement_name_snapshot TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  instructions_snapshot TEXT,
  UNIQUE (workout_id, position),
  UNIQUE (id, workout_id)
) STRICT;

CREATE TABLE workout_prescribed_sets (
  id TEXT PRIMARY KEY,
  workout_movement_prescription_id TEXT NOT NULL
    REFERENCES workout_movement_prescriptions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  target_repetitions_min INTEGER
    CHECK (target_repetitions_min >= 0),
  target_repetitions_max INTEGER
    CHECK (target_repetitions_max >= 0),
  target_effort_min REAL,
  target_effort_max REAL,
  UNIQUE (workout_movement_prescription_id, position),
  UNIQUE (id, workout_movement_prescription_id),
  CHECK (
    target_repetitions_min IS NULL
    OR target_repetitions_max IS NULL
    OR target_repetitions_max >= target_repetitions_min
  ),
  CHECK (
    target_effort_min IS NULL
    OR target_effort_max IS NULL
    OR target_effort_max >= target_effort_min
  )
) STRICT;
```

Snapshot names are historical display values. Their duplication is intentional because they describe the routine and movement as presented when the workout started rather than their current names.

The workout's immutable `effort_metric_code` qualifies every snapshotted effort target and every effort value recorded in that workout.

## Performed Sets

```sql
CREATE TABLE performed_sets (
  id TEXT PRIMARY KEY,
  workout_movement_prescription_id TEXT NOT NULL
    REFERENCES workout_movement_prescriptions(id) ON DELETE RESTRICT,
  workout_prescribed_set_id TEXT,
  machine_id TEXT NOT NULL
    REFERENCES machines(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  repetitions INTEGER NOT NULL CHECK (repetitions >= 0),
  load_value REAL NOT NULL CHECK (load_value >= 0),
  effort_value REAL,
  performed_at INTEGER NOT NULL,
  UNIQUE (workout_movement_prescription_id, position),
  FOREIGN KEY (
    workout_prescribed_set_id,
    workout_movement_prescription_id
  ) REFERENCES workout_prescribed_sets (
    id,
    workout_movement_prescription_id
  ) ON DELETE RESTRICT
) STRICT;
```

`workout_prescribed_set_id` is nullable because warmups and additional performed sets may not correspond to a planned set.

A performed set reaches its retained context through protected relationships:

| Context             | Relationship path                                                                |
| ------------------- | -------------------------------------------------------------------------------- |
| Workout             | `performed_sets -> workout_movement_prescriptions -> workouts`                   |
| Movement            | `performed_sets -> workout_movement_prescriptions -> movements`                  |
| Gym                 | `performed_sets -> workout_movement_prescriptions -> workouts -> gyms`           |
| Machine             | `performed_sets -> machines`                                                     |
| Load representation | `performed_sets -> machines -> load_representations`                             |
| Effort metric       | `performed_sets -> workout_movement_prescriptions -> workouts -> effort_metrics` |

These paths satisfy the historical-context rules without duplicating gym, movement, load representation, or effort metric columns on every performed set.

## Required Integrity Triggers

Generated migrations must create triggers for invariants that ordinary foreign keys cannot express:

1. A movement prescription's routine and movement belong to the same trainee.
2. A workout's routine and gym belong to the same trainee.
3. A workout movement snapshot's movement belongs to the workout's trainee.
4. A performed set's machine belongs to the workout's gym.
5. A machine's `gym_id` and `load_representation_code` cannot change.
6. A workout's `routine_id`, `gym_id`, `routine_name_snapshot`, `effort_metric_code`, and `started_at` cannot change.
7. A `plate_count` performed-set load is a whole number.

Triggers must cover both inserts and updates when the affected relation remains mutable.

Different load representations remain separate facts. The database must not persist inferred weight for plate-count sets or a universal normalized load.

## Snapshot Transaction

The workout repository starts a workout as one exclusive transaction:

1. Read the trainee's current effort metric and the selected routine and gym.
2. Validate that the routine, gym, movements, and effort targets belong to a consistent trainee and metric context.
3. Insert the `workouts` row with the selected metric and routine display snapshot.
4. Copy every ordered `movement_prescriptions` row into `workout_movement_prescriptions`.
5. Copy every ordered `prescribed_sets` row into `workout_prescribed_sets`.
6. Commit only after the complete snapshot exists.

The Expo SDK 57 implementation should use `withExclusiveTransactionAsync()` for this boundary. A partially populated workout must never become observable.

## Indexes

```sql
CREATE INDEX gyms_by_trainee
  ON gyms (trainee_id, archived_at, name);

CREATE INDEX movements_by_trainee
  ON movements (trainee_id, archived_at, name);

CREATE INDEX routines_by_trainee
  ON routines (trainee_id, archived_at, name);

CREATE INDEX machines_by_gym
  ON machines (gym_id, archived_at, name);

CREATE INDEX workouts_by_gym
  ON workouts (gym_id, started_at DESC);

CREATE INDEX workouts_by_routine
  ON workouts (routine_id, started_at DESC);

CREATE INDEX workout_prescriptions_by_movement
  ON workout_movement_prescriptions (movement_id, workout_id);

CREATE INDEX performed_sets_by_machine
  ON performed_sets (machine_id, performed_at DESC);
```

Add reporting indexes only after concrete reporting queries exist and their query plans have been measured.

## Extension Rules

- Add new prescription concepts through typed child tables and corresponding workout snapshot tables.
- Do not introduce generic `kind/value`, polymorphic `entity_type/entity_id`, or JSON payloads for core training facts.
- Add machine calibration as a separate policy that preserves the original recorded plate count.
- Add cross-representation comparison as an explicit policy rather than rewriting historical loads.
- Add a `machine_movements` association only if the product later needs an explicit many-to-many machine compatibility list.
- Keep the original performed-set values and their context authoritative when adding derived reporting data.

## Unresolved Product Behavior

The schema safely qualifies routine effort targets with their authored metric, but the accepted business rules do not yet specify what happens to those targets when a trainee switches between RPE and RIR. Before implementing effort-metric switching, decide whether incompatible current targets are cleared, manually re-authored, or retained separately. They must not be silently converted or reinterpreted.
