# Implementation Plan: Training Preferences

Module id: `training-preferences`

Status: Approved
Approved: 2026-09-19

Approved specification: `SPEC-training-preferences.md`

## Overview

Build the first Crowbar capability as a complete local-first vertical path: initialize the shared SQLite database, persist one global RPE/RIR preference, expose validated conversion behavior to later modules, require an explicit first-run choice, and allow changes from settings. Establish the repository's test and localization foundations as part of this work because neither exists yet.

## Current State

- The app is an Expo SDK 57 shell with one placeholder route and a root `Stack`.
- TypeScript strict mode and Expo Router typed routes are enabled.
- `expo-localization`, i18next, react-i18next, and Zod are installed but not configured.
- The Node-oriented `sqlite` and AsyncStorage packages are installed but unused.
- No test runner, test files, persistence layer, localization resources, or domain modules exist.

## Architecture Decisions

### 1. One Expo SQLite database

Use `expo-sqlite` and a root `SQLiteProvider` for the shared `crowbar.db` database. Remove `sqlite` and AsyncStorage so the application has one local persistence owner. Initialize WAL mode and foreign-key enforcement before running migrations.

### 2. Versioned schema initialization

Use `PRAGMA user_version` as the database schema version. Run pending migrations in ascending order through an exclusive transaction. Set `user_version` only after a migration succeeds so a failed migration rolls back and retries on the next launch.

Schema version 1 contains only this module's data:

```sql
CREATE TABLE training_preferences (
  singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
  effort_metric TEXT NOT NULL CHECK (effort_metric IN ('rpe', 'rir'))
);
```

No row means the trainee has not chosen a metric. The repository reads only `singleton_id = 1` and writes with a bound-parameter upsert:

```sql
INSERT INTO training_preferences (singleton_id, effort_metric)
VALUES (1, ?)
ON CONFLICT(singleton_id)
DO UPDATE SET effort_metric = excluded.effort_metric;
```

There is no public delete/reset operation. Tests may create isolated databases or fakes without adding production reset behavior.

### 3. Pure domain contract

Keep `EffortMetric`, range validation, and conversion in a React-free module. Support `rpe` values from 5.0 through 10.0 and `rir` values from 0.0 through 5.0 in 0.5 increments. Reject non-finite values before checking ranges. Conversion is identity within one metric and `10 - value` across metrics.

### 4. Narrow repository boundary

Define a `TrainingPreferencesRepository` contract with `read()` and `save(metric)` operations. The SQLite adapter validates selected rows with Zod and binds all write values. Missing or invalid rows return `null`; database access errors reject and remain distinguishable from the unselected state.

### 5. Explicit provider state machine

Expose preference state through a feature-owned React context:

```text
loading -> ready(metric | null)
loading -> load-error -> loading (retry)
ready -> saving -> ready(new metric)
ready -> saving -> save-error(prior metric)
```

Writes are pessimistic: consumers observe the new metric only after the durable write succeeds. A save failure retains the prior metric and exposes a retryable localized error. The provider accepts the repository contract so component tests do not depend on native SQLite.

### 6. Protected app routes

Keep `/` as the first-run route. When a preference exists, `/` redirects into the `(app)` route group. Protect `(app)` with Expo Router's SDK 57 `Stack.Protected`; direct navigation cannot bypass the first-run requirement. The root layout waits for database migration and preference hydration before rendering the navigator.

### 7. Localization at the first user-facing slice

Initialize i18next from `expo-localization`, provide complete `en` and `es` resources, and enable English fallback. Declare both supported locales in the `expo-localization` app config plugin. Translation resources include first-run, settings, loading, validation, and storage-error copy before UI tasks consume them.

### 8. Behavioral tests over snapshots

Use Jest with `jest-expo` and React Native Testing Library. Pure domain and repository contract tests cover edge cases; component tests cover loading, errors, selection, protected navigation, and settings changes. Native SQLite persistence and screen-reader behavior receive explicit iOS/Android manual checks because Jest mocks cannot prove native storage or assistive-technology behavior.

## Dependency Graph

```text
Task 1: Tooling and dependencies
  |-- Task 2: SQLite schema and migration
  |     `-- Task 3: Domain and repository
  |           `-- Task 5: Provider and route protection
  |                 |-- Task 6: First-run flow
  |                 `-- Task 7: Settings flow
  `-- Task 4: Localization foundation
        |-- Task 5
        |-- Task 6
        `-- Task 7
```

Task 4 can proceed in parallel with Tasks 2 and 3 after Task 1. Tasks 5-7 are sequential because they share provider and route contracts.

## Task List

### Phase 1: Foundations

- [ ] Task 1: Establish Expo-compatible persistence and test tooling.
- [ ] Task 2: Initialize SQLite and apply schema version 1.

### Checkpoint: Persistence Foundation

- [ ] Dependency diagnostics, focused tests, lint, and typecheck pass.
- [ ] Schema creation and migration retry behavior are covered.

### Phase 2: Module Contract

- [ ] Task 3: Implement effort rules and the preference repository.
- [ ] Task 4: Establish English/Spanish localization.

### Checkpoint: Contract

- [ ] Domain, repository, and localization tests pass.
- [ ] Consumer code does not import SQLite or translation resource internals.

### Phase 3: User Flows

- [ ] Task 5: Hydrate global preference state and protect app routes.
- [ ] Task 6: Deliver the explicit first-run selection flow.
- [ ] Task 7: Deliver the settings preference-change flow and final verification.

### Checkpoint: Complete

- [ ] All specification success criteria are covered by automated or named manual checks.
- [ ] Coverage thresholds, lint, typecheck, Expo Doctor, and iOS/Android bundle checks pass.
- [ ] Persistence survives force-quit/relaunch on iOS and Android while offline.
- [ ] VoiceOver and TalkBack announce both preference controls and their selected states correctly.

## Verification Strategy

Run focused tests after every task. At each checkpoint run:

```sh
bun run test -- --runInBand
bunx expo lint
bunx tsc --noEmit
```

Before completing the module run:

```sh
bun run test -- --coverage --runInBand
bunx expo lint
bunx tsc --noEmit
bunx expo-doctor
bunx expo export --platform ios --output-dir dist/ios
bunx expo export --platform android --output-dir dist/android
```

The two existing duplicate-import lint warnings in `components/ui/gluestack-ui-provider/index.tsx` are outside this module. Do not modify that file unless a later task directly requires it.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Native SQLite behavior differs from Jest mocks | High | Keep SQL minimal and bound, test the repository contract, run Expo Doctor and native bundle checks, and verify persistence on both platforms. |
| A failed migration leaves startup unusable | High | Use an exclusive transaction, advance `user_version` last, expose a retry state, and test rollback/retry behavior. |
| Route content flashes before hydration | Medium | Hold navigator rendering in an explicit loading state until migration and preference reads finish. |
| Save errors make UI and disk disagree | High | Use pessimistic writes and retain the prior metric until persistence succeeds. |
| Translation keys leak to users | Medium | Test English, Spanish, and unsupported-locale fallback before building screens. |
| Future modules couple directly to SQLite | Medium | Export only the domain and preference context contracts from the feature boundary. |

## Open Questions

None.
