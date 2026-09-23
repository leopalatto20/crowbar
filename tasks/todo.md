# Tasks: Exercise Catalog

Status: In progress
Approved: 2026-09-21

Specification: `SPEC-exercise-catalog.md`

Plan: `tasks/plan.md`

## Task 1: Add Atomic Schema Version 2

**Description:** Extend the existing ordered migration runner with the exact custom-exercise and hidden-built-in tables from the approved plan.

**Acceptance criteria:**
- [x] Version 2 creates both constrained tables without modifying version 1 or copying built-in definitions into SQLite.
- [x] Fresh databases advance through versions 1 and 2, version-1 databases apply only version 2, and current databases do no migration work.
- [x] A failure creating either table rolls back both version-2 changes and leaves `user_version = 1` for retry.

**Verification:**
- [x] `bun run test -- --runInBand src/db/__tests__/migrate-test.ts`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** None

**Files likely touched:**
- `src/db/migrate.ts`
- `src/db/__tests__/migrate-test.ts`

**Estimated scope:** Small, 2 files

## Task 2: Define the Catalog Model

**Description:** Add branded identities, the fixed muscle-group taxonomy and order, public exercise/mutation contracts, and pure custom-name validation.

**Acceptance criteria:**
- [x] IDs, all 14 muscle groups, origins, availability, input, and machine-readable mutation results match the specification.
- [x] Name parsing trims display values, enforces 1-80 Unicode code points, rejects invisible control/format content, and generates deterministic case-insensitive NFC duplicate keys.
- [x] Tests cover every muscle group, valid boundaries, blank/overlong/control input, case duplicates, accents, and composed/decomposed names with 100% validation branch coverage.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/catalog-model-test.ts`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** None

**Files likely touched:**
- `src/features/exercise-catalog/model/catalog.ts`
- `src/features/exercise-catalog/model/custom-exercise.ts`
- `src/features/exercise-catalog/__tests__/catalog-model-test.ts`

**Estimated scope:** Medium, 3 files

## Task 3: Add the Localized Starter Manifest

**Description:** Define all 74 built-in exercises with stable opaque IDs and complete English/Spanish translation resources, then validate the manifest as catalog data.

**Acceptance criteria:**
- [x] The manifest exactly matches the approved exercise names, groups, and fixed ordering; IDs are unique valid opaque literals and translation keys are not identities.
- [x] English and Spanish contain every built-in name, muscle-group label, origin label, control label, validation message, persistence error, and accessibility announcement required by later UI tasks.
- [x] Tests reject duplicate/invalid IDs, invalid groups, missing translations, or altered membership/order and provide 100% manifest-validation branch coverage.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/builtin-manifest-test.ts src/i18n/__tests__/i18n-test.ts`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/exercise-catalog/data/builtin-exercises.ts`
- `src/features/exercise-catalog/__tests__/builtin-manifest-test.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/es.ts`
- `src/i18n/__tests__/i18n-test.ts`

**Estimated scope:** Medium, 5 files

## Checkpoint: Foundation

- [x] Tasks 1-3 acceptance criteria pass.
- [x] `bun run test -- --runInBand`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`
- [x] Review schema version 2, built-in IDs, and exact starter membership before persistence code continues.

## Task 4: Implement the SQLite Repository

**Description:** Persist custom definitions and built-in visibility behind a narrow repository contract with complete row validation and atomic custom creation.

**Acceptance criteria:**
- [x] Reads validate every custom row and hidden built-in ID with Zod and reject the complete load when any row is invalid or references an unknown built-in.
- [x] Create, update, archive/restore, and hide/restore use bound values, preserve IDs, are idempotent where required, and return enough state for pessimistic provider updates.
- [x] Contract tests cover success, duplicate names, unknown IDs, invalid persisted rows, read/write failures, create rollback, affected-row checks, and repeated availability mutations.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/exercise-catalog-repository-test.ts`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Tasks 1-3

**Files likely touched:**
- `src/features/exercise-catalog/data/exercise-catalog-repository.ts`
- `src/features/exercise-catalog/__tests__/exercise-catalog-repository-test.ts`

**Estimated scope:** Medium, 2 files

## Task 5: Implement Catalog Selection Rules

**Description:** Add pure composition, resolution, accent-insensitive search, availability/group filtering, grouping, and locale-aware deterministic sorting.

**Acceptance criteria:**
- [x] Built-ins and custom rows combine into localized `CatalogExercise` values while hidden/archived entries remain resolvable by ID.
- [x] Available/unavailable listing supports no filter or one valid group, case- and accent-insensitive search, fixed group order, and locale-name order.
- [x] Tests cover English, Spanish, unsupported fallback inputs, accents, empty criteria, every group, duplicate display names across origins, and deterministic tie breakers with 100% selector branch coverage.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/catalog-selectors-test.ts`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Tasks 2 and 3

**Files likely touched:**
- `src/features/exercise-catalog/model/catalog-selectors.ts`
- `src/features/exercise-catalog/__tests__/catalog-selectors-test.ts`

**Estimated scope:** Small, 2 files

## Task 6: Implement the Reactive Consumer Contract

**Description:** Combine repository state, the manifest, and current translations in a root provider that exposes all catalog reads and pessimistic mutations through one hook.

**Acceptance criteria:**
- [x] State distinguishes loading, ready, load error, mutation in progress, and mutation error while retaining the last durable catalog on failures.
- [x] Public methods return explicit invalid-input, duplicate-name, not-found, immutable-builtin, or persistence-error results and serialize concurrent writes.
- [x] Tests prove retry, immediate mounted-consumer updates, locale re-resolution, ID-preserving edits, unavailable resolution, failed-write rollback, and concurrent mutation ordering.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/exercise-catalog-provider-test.tsx`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Tasks 3-5

**Files likely touched:**
- `src/features/exercise-catalog/exercise-catalog-provider.tsx`
- `src/features/exercise-catalog/__tests__/exercise-catalog-provider-test.tsx`
- `src/app/app-providers.tsx`

**Estimated scope:** Medium, 3 files

## Checkpoint: Consumer Contract

- [x] Tasks 4-6 acceptance criteria pass.
- [x] `bun run test -- --runInBand`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`
- [x] Confirm downstream code needs only catalog types and `useExerciseCatalog`, never SQLite, translation objects, or routes.

## Task 7: Generate the Gluestack Input Primitive

**Description:** Add the project-maintained Gluestack text-input component needed by catalog search and custom-name forms.

**Acceptance criteria:**
- [x] The component is generated under `src/components/ui/input/` using `gluestack-ui.config.json` and supports labels, errors, disabled state, refs, and text scaling.
- [x] Existing runtime dependencies and package versions are unchanged; implementation pauses for approval if generation requests a dependency change.
- [x] A focused smoke test proves controlled text entry, accessible naming, disabled state, and ref focus behavior.

**Verification:**
- [x] `bun run test -- --runInBand src/components/ui/input`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** None

**Files likely touched:**
- `src/components/ui/input/`
- `src/components/ui/input/__tests__/input-test.tsx`

**Estimated scope:** Medium, generated component directory plus test

## Task 8: Build the Shared Custom Exercise Form

**Description:** Create one localized form used for dedicated creation, editing, and inline-picker creation, backed by the catalog validation contract.

**Acceptance criteria:**
- [x] The form collects a name and exactly one required muscle group, supports create/edit initial values, and presents localized field-level errors for all invalid and duplicate submissions.
- [x] Save remains pessimistic, a persistence failure keeps entered values and prior catalog state, and cancel/success restores logical focus through explicit callbacks.
- [x] Component tests cover valid create/edit, trimming, blank/overlong/invalid-group/duplicate errors, save failure, disabled state, cancellation, and accessibility associations.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/custom-exercise-form-test.tsx`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Tasks 6 and 7

**Files likely touched:**
- `src/features/exercise-catalog/ui/custom-exercise-form.tsx`
- `src/features/exercise-catalog/ui/muscle-group-picker.tsx`
- `src/features/exercise-catalog/__tests__/custom-exercise-form-test.tsx`

**Estimated scope:** Medium, 3 files

## Task 9: Deliver the Dedicated Catalog Screen

**Description:** Build the grouped mobile catalog browser with combined search/filtering, explicit unavailable recovery, origin labels, and all origin-appropriate lifecycle actions.

**Acceptance criteria:**
- [x] Available entries render in fixed groups with search, one group filter, clear controls, origin and group text, and a no-results state; the unavailable view uses the same criteria.
- [x] Custom create/edit/archive/restore and built-in hide/restore work with localized errors, retry, result announcements, at least 44-point targets, and defined focus restoration.
- [x] Component tests cover load/retry, combined criteria, empty states, every lifecycle action, immutable built-ins, failed mutations, unavailable recovery, and supported locale copy without snapshots.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/exercise-catalog-screen-test.tsx`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`
- [ ] Manual check: text scaling and keyboard interaction on one iOS and one Android target.

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/exercise-catalog/ui/exercise-catalog-screen.tsx`
- `src/features/exercise-catalog/ui/exercise-list.tsx`
- `src/features/exercise-catalog/__tests__/exercise-catalog-screen-test.tsx`

**Estimated scope:** Medium, 3 files

## Task 10: Deliver the Reusable Inline Picker

**Description:** Add a route-independent picker for routine programming that searches the available catalog and creates/selects a custom exercise inline.

**Acceptance criteria:**
- [x] Search and muscle filtering match the dedicated catalog while hidden/archived entries are excluded and one stable ID is returned on selection.
- [x] Inline creation uses the shared form and selects the newly durable ID after success; cancel or save failure retains the previous selection and logical focus.
- [x] Tests cover selection, combined criteria, hidden/archived exclusion, create, duplicate/invalid input, cancellation, persistence failure, announcements, and focus behavior.

**Verification:**
- [x] `bun run test -- --runInBand src/features/exercise-catalog/__tests__/exercise-picker-test.tsx`
- [x] `bunx expo lint`
- [x] `bunx tsc --noEmit`

**Dependencies:** Task 8

**Files likely touched:**
- `src/features/exercise-catalog/ui/exercise-picker.tsx`
- `src/features/exercise-catalog/__tests__/exercise-picker-test.tsx`

**Estimated scope:** Small, 2 files

## Task 11: Wire Routes and Complete Verification

**Description:** Expose the dedicated catalog through a thin Expo Router route, link it from the protected app, enforce coverage gates, and run all automated and manual completion checks.

**Acceptance criteria:**
- [ ] `/exercises` renders only a thin route wrapper, is reachable from the protected landing screen, and no tests or non-route modules live under `src/app/`.
- [ ] Jest enforces 100% branch coverage for validation/manifest/selectors and at least 90% line and branch coverage for the complete feature.
- [ ] Every automated command passes and named iOS/Android persistence, accessibility, focus, touch-target, and text-scaling checks are recorded complete.

**Verification:**
- [ ] `bun run test -- --coverage --runInBand`
- [ ] `bunx expo lint`
- [ ] `bunx tsc --noEmit`
- [ ] `bunx expo-doctor`
- [ ] `bunx expo export --platform ios --output-dir dist/ios`
- [ ] `bunx expo export --platform android --output-dir dist/android`
- [ ] Manual check: custom IDs, edits, archives, and built-in visibility survive force-quit/relaunch offline on iOS and Android.
- [ ] Manual check: VoiceOver and TalkBack announce controls, state, errors, and mutations with correct focus restoration.

**Dependencies:** Tasks 9 and 10

**Files likely touched:**
- `src/app/(app)/exercises/index.tsx`
- `src/app/(app)/index.tsx`
- `package.json`
- `tasks/todo.md`

**Estimated scope:** Medium, 4 files

## Checkpoint: Complete

- [ ] Every task and checkpoint above is complete.
- [ ] Every success criterion in `SPEC-exercise-catalog.md` is satisfied.
- [ ] No implementation extends into routine prescriptions, equipment contexts, workout logging, or history.
- [ ] Human review confirms the catalog consumer contract before `routine-programming` begins.
