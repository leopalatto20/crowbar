# Backlog

## In flight

## Queued

- [ ] db-runtime-init - Initialize SQLite connections and migrations safely blocked-by: db-schema-core (repo: crowbar) (kind: ship) (priority: 1) (since 2026-09-18)
      Build the src/data database bootstrap around expo-sqlite and the generated Drizzle migrations.

  Scope:
  - Open the application database through one owned data-layer interface.
  - Enable PRAGMA foreign_keys = ON for every opened connection before application queries can run.
  - Set PRAGMA journal_mode = WAL during database initialization.
  - Apply bundled migrations deterministically and surface initialization failures instead of exposing a partially initialized database.
  - Keep Expo/SQLite dependencies inside src/data and expose repository-oriented access rather than raw queries to features or routes.

  Acceptance:
  - A fresh database initializes and migrates successfully.
  - Reopening an initialized database is idempotent.
  - Tests prove foreign-key enforcement is active and WAL is configured.
  - Initialization errors do not return a usable database handle.
  - Formatting, typecheck, and relevant tests pass.

- [ ] db-integrity-triggers - Add required cross-table and immutability triggers blocked-by: db-schema-core (repo: crowbar) (kind: ship) (priority: 1) (since 2026-09-18)
      Add migration SQL for every invariant in the Required Integrity Triggers section of docs/database-schema.md.

  Scope:
  - Reject movement prescriptions whose routine and movement have different trainees.
  - Reject workouts whose routine and gym have different trainees.
  - Reject workout movement snapshots whose movement does not belong to the workout trainee.
  - Reject performed sets whose machine does not belong to the workout gym.
  - Make machine gym_id and load_representation_code immutable.
  - Make workout routine_id, gym_id, routine_name_snapshot, effort_metric_code, and started_at immutable.
  - Require plate_count load_value to be a whole number.
  - Cover INSERT and UPDATE paths wherever the affected relation remains mutable, using clear SQLite errors.

  Acceptance:
  - Migration applies on top of db-schema-core and creates named, inspectable triggers.
  - Focused tests demonstrate each invalid insert/update is rejected and valid writes still succeed.
  - Trigger checks follow the retained relationship paths documented for performed sets.
  - Formatting, typecheck, and relevant tests pass.

- [ ] db-workout-snapshot - Implement atomic workout snapshot creation blocked-by: db-runtime-init blocked-by: db-integrity-triggers (repo: crowbar) (kind: ship) (priority: 1) (since 2026-09-18)
      Implement the workout repository operation described by the Snapshot Transaction section of docs/database-schema.md.

  Scope:
  - Start a workout with expo-sqlite withExclusiveTransactionAsync() so no partial snapshot can become observable.
  - Read the trainee current effort metric plus the selected routine and gym inside the transaction.
  - Validate consistent trainee ownership for the routine, gym, prescribed movements, and authored effort targets.
  - Insert the workout with routine name and effort metric snapshots.
  - Copy every movement prescription and prescribed set in position order into workout-owned snapshot rows with application-generated TEXT IDs.
  - Commit only when the complete graph exists; roll back every inserted row on validation or write failure.
  - Return a repository/domain result without leaking SQLite details to callers.
  - Do not implement effort-metric switching or silently convert/reinterpret incompatible targets.

  Acceptance:
  - Tests prove complete ordered snapshots are independent from later routine, movement-name, and trainee effort-setting changes (BR-008, BR-009, BR-012).
  - Tests prove mismatched trainee/metric context is rejected.
  - A forced failure while copying prescriptions leaves no workout or snapshot rows.
  - Concurrent readers cannot observe a partial workout snapshot.
  - Formatting, typecheck, and relevant tests pass.

## Done

- [x] db-schema-core - Define the accepted SQLite schema and initial migration (repo: crowbar) (kind: ship) (priority: 1) (done 2026-09-18)
      Implement the relational contract in docs/database-schema.md under src/data using Drizzle SQLite schema definitions and an initial generated migration.

  Scope:
  - Define effort_metrics, load_representations, trainees, gyms, movements, routines, movement_prescriptions, prescribed_sets, machines, workouts, workout_movement_prescriptions, workout_prescribed_sets, and performed_sets with the documented columns, types, nullability, checks, uniqueness, composite foreign keys, and delete behavior.
  - Ensure identifiers and timestamps follow the documented TEXT ID and UTC Unix millisecond conventions.
  - Provide an idempotent data-layer runtime bootstrap that inserts exactly the accepted lookup codes: rpe, rir, kilograms, pounds, and plate_count, after migrations complete.
  - Create the eight documented indexes with the specified columns and ordering.
  - Keep mutable planning and immutable workout snapshot tables separate; do not add inferred/normalized loads, target set counts, generic kind/value data, JSON core facts, or effort-metric switching behavior.

  Acceptance:
  - The generated migration applies successfully to an empty SQLite database.
  - The resulting sqlite_master metadata matches the accepted schema, constraints, and indexes.
  - The runtime lookup bootstrap inserts the exact accepted lookup rows, is safe to run repeatedly, and writes both lookup tables transactionally.
  - TypeScript schema exports support repositories without exposing raw SQLite queries outside src/data.
  - Formatting, typecheck, and relevant tests pass.
    Removed SQLite STRICT requirement. Generated migration remains unmodified; lookup codes are inserted by transactional idempotent runtime bootstrap in src/data/lookup-bootstrap.ts with focused coverage.
