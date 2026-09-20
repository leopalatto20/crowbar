# Tasks: Training Preferences

Status: Approved
Approved: 2026-09-19

Specification: `SPEC-training-preferences.md`

Plan: `tasks/plan.md`

## Task 1: Establish Tooling and Dependencies

**Description:** Replace incompatible or redundant persistence packages with Expo SQLite and establish Expo's documented Jest setup before feature implementation.

**Acceptance criteria:**
- [x] `expo-sqlite`, Jest, `jest-expo`, Jest types, and React Native Testing Library are installed at Expo-compatible versions; `sqlite` and AsyncStorage are removed.
- [x] Package scripts run deterministic tests and coverage, and Jest uses the `jest-expo` preset with the Bun-compatible transform pattern.
- [x] A smoke test passes, TypeScript recognizes Jest globals, and coverage output is ignored by Git.

**Verification:**
- [x] `bun run test -- --runInBand`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`
- [x] `bunx expo-doctor`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `bun.lock`
- `tsconfig.json`
- `.gitignore`
- `src/testing/__tests__/tooling-test.ts`

**Estimated scope:** Medium, 5 files

## Task 2: Initialize SQLite Schema Version 1

**Description:** Add the shared database provider and ordered migration runner, including the singleton `training_preferences` table defined by the plan.

**Acceptance criteria:**
- [x] Initialization enables WAL and foreign keys, reads `PRAGMA user_version`, and applies pending migrations in ascending order.
- [x] Version 1 creates the constrained singleton table and advances the version only after successful completion.
- [x] Migration tests cover a fresh database, an already-current database, and a failed migration that remains retryable.

**Verification:**
- [x] `bun run test -- --runInBand src/db`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Task 1

**Files likely touched:**
- `src/db/migrate.ts`
- `src/db/database-provider.tsx`
- `src/db/__tests__/migrate-test.ts`

**Estimated scope:** Medium, 3 files

## Checkpoint: Persistence Foundation

- [x] Tasks 1-2 acceptance criteria pass.
- [x] `bun run test -- --runInBand`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`
- [x] Review migration SQL and failure semantics before continuing.

## Task 3: Implement Domain and Repository Contracts

**Description:** Implement pure effort conversion/validation and the SQLite-backed preference repository behind a narrow consumer-facing contract.

**Acceptance criteria:**
- [ ] Domain functions enforce finite half-step RPE 5.0-10.0 and RIR 0.0-5.0 values and exact identity/cross-metric conversion.
- [ ] The repository returns `null` for missing or invalid values, propagates database errors, and performs an atomic bound-parameter upsert.
- [ ] Unit and repository contract tests cover all specified boundaries, idempotent saves, invalid rows, and read/write failures.

**Verification:**
- [ ] `bun run test -- --runInBand src/features/training-preferences`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/training-preferences/model/effort.ts`
- `src/features/training-preferences/data/training-preferences-repository.ts`
- `src/features/training-preferences/__tests__/effort-test.ts`
- `src/features/training-preferences/__tests__/training-preferences-repository-test.ts`

**Estimated scope:** Medium, 4 files

## Task 4: Establish Localization Foundation

**Description:** Configure English and Spanish resources with device-locale selection and English fallback before adding user-facing preference screens.

**Acceptance criteria:**
- [ ] i18next initializes from `expo-localization` and falls back to English for unsupported locales and missing Spanish keys.
- [ ] English and Spanish resources contain all first-run, settings, loading, validation, accessibility, and persistence-error strings required by this module.
- [ ] App configuration declares English and Spanish as supported iOS and Android locales, and locale tests pass.

**Verification:**
- [ ] `bun run test -- --runInBand src/i18n`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`

**Dependencies:** Task 1

**Files likely touched:**
- `app.json`
- `src/i18n/index.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/es.ts`
- `src/i18n/__tests__/i18n-test.ts`

**Estimated scope:** Medium, 5 files

## Checkpoint: Module Contract

- [ ] Tasks 3-4 acceptance criteria pass.
- [ ] `bun run test -- --runInBand`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`
- [ ] Confirm downstream imports expose domain/repository contracts without SQLite or resource internals.

## Task 5: Hydrate State and Protect Routes

**Description:** Wire SQLite, localization, and a pessimistic preference provider into the root layout, then protect the main app route group until a preference exists.

**Acceptance criteria:**
- [ ] Provider states distinguish loading, ready, load failure, saving, and save failure while retaining the prior metric after failed writes.
- [ ] The root waits for database and preference hydration, offers retry after load failure, and uses SDK 57 `Stack.Protected` to prevent bypassing first-run selection.
- [ ] Component tests prove hydration, immediate successful updates, failed-write rollback, retry behavior, and route guard changes.

**Verification:**
- [ ] `bun run test -- --runInBand src/features/training-preferences/__tests__/training-preferences-provider-test.tsx`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`

**Dependencies:** Tasks 3 and 4

**Files likely touched:**
- `src/features/training-preferences/training-preferences-provider.tsx`
- `src/features/training-preferences/ui/preference-load-state-screen.tsx`
- `src/features/training-preferences/__tests__/training-preferences-provider-test.tsx`
- `src/app/app-providers.tsx`
- `src/app/_layout.tsx`

**Estimated scope:** Medium, 5 files

## Task 6: Deliver First-Run Selection

**Description:** Replace the placeholder route with an accessible, localized first-run selection and a protected app landing route.

**Acceptance criteria:**
- [ ] A fresh or invalid preference shows neither option preselected and cannot enter `(app)` until a durable choice succeeds.
- [ ] RPE and RIR controls expose labels, descriptions, roles, selected state, disabled/saving state, and a recoverable localized save error.
- [ ] Existing preferences redirect `/` into `(app)`, whose landing screen provides access to training preference settings.

**Verification:**
- [ ] `bun run test -- --runInBand src/features/training-preferences/__tests__/first-run-preference-screen-test.tsx`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`
- [ ] Manual check: complete first-run selection in English and Spanish on one simulator or device.

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/training-preferences/ui/effort-metric-picker.tsx`
- `src/features/training-preferences/ui/first-run-preference-screen.tsx`
- `src/features/training-preferences/__tests__/first-run-preference-screen-test.tsx`
- `src/app/index.tsx`
- `src/app/(app)/index.tsx`

**Estimated scope:** Medium, 5 files

## Task 7: Deliver Settings and Final Verification

**Description:** Add the protected settings flow for changing the preference and complete automated and native verification for the module.

**Acceptance criteria:**
- [ ] Settings shows the durable current metric and changes it only after a successful write; mounted consumers immediately render equivalent converted values.
- [ ] Settings tests cover successful changes, identity saves, failed writes, English/Spanish copy, and unsupported-locale fallback.
- [ ] Coverage thresholds and all final automated/manual checks in the approved plan pass on iOS and Android.

**Verification:**
- [ ] `bun run test -- --coverage --runInBand`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`
- [ ] `bunx expo-doctor`
- [ ] `bunx expo export --platform ios --output-dir dist/ios`
- [ ] `bunx expo export --platform android --output-dir dist/android`
- [ ] Manual check: preference survives force-quit/relaunch offline on iOS and Android.
- [ ] Manual check: VoiceOver and TalkBack announce labels and selected state correctly.

**Dependencies:** Task 6

**Files likely touched:**
- `src/features/training-preferences/ui/training-preferences-settings-screen.tsx`
- `src/features/training-preferences/__tests__/training-preferences-settings-screen-test.tsx`
- `src/app/(app)/settings/training-preferences.tsx`

**Estimated scope:** Medium, 3 files

## Checkpoint: Complete

- [ ] Every task and checkpoint above is complete.
- [ ] Every success criterion in `SPEC-training-preferences.md` is satisfied.
- [ ] No implementation extends into `routine-programming` or later capability-map modules.
- [ ] Human review confirms the module before work begins on `routine-programming`.
