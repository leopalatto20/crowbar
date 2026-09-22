# Spec: Exercise Catalog

Module id: `exercise-catalog`

Status: Approved
Approved: 2026-09-21

Sources: `CAPABILITY-MAP.md`, `PRODUCT.md`, `docs/ideas/progressive-gym-adapters.md`, `docs/intent/progressive-gym-adapters.md`, and the product decisions confirmed on 2026-09-21

## Objective

Give the single local trainee a reusable exercise catalog that supplies stable exercise identities to routine programming, gym adapters, workout logging, and contextual history. The catalog starts useful without setup, supports the trainee's own movements, and keeps an exercise recognizable across workouts, gyms, equipment contexts, routine edits, and language changes.

The module includes:

- A localized starter catalog grouped by one primary muscle group per exercise.
- A dedicated catalog screen for browsing, searching, filtering, creating, editing, hiding, archiving, and restoring exercises as allowed by exercise origin.
- An inline searchable and filterable picker for routine programming, including custom exercise creation without leaving the programming flow.
- Stable, opaque exercise identities and a read contract for downstream modules.
- Local offline persistence for custom exercises and catalog visibility.
- English and Spanish copy with English fallback.

The module does not include routine prescriptions, target sets, rep ranges, effort targets, equipment contexts, set logging, exercise instructions, secondary muscles, media, automatic muscle classification, cloud sync, or a shared community catalog.

## Catalog Model

Each exercise has:

- A stable opaque ID that never changes when its name, muscle group, visibility, or locale changes.
- Exactly one primary muscle group.
- An origin of `builtin` or `custom`.
- A display name.
- An availability state that controls whether it appears in new selections.

The fixed muscle-group IDs and their display order are:

1. `chest`
2. `upper-back`
3. `lats`
4. `shoulders`
5. `biceps`
6. `triceps`
7. `forearms`
8. `quads`
9. `hamstrings`
10. `glutes`
11. `calves`
12. `adductors`
13. `core`
14. `lower-back`

Muscle-group labels are localized. IDs are not translated or derived from labels.

Built-in exercises use stable IDs and localized names supplied by the application. Their names and muscle groups cannot be edited. A trainee may hide a built-in exercise and later restore it.

Custom exercises use a trainee-entered name and one required muscle group. A trainee may create, rename, regroup, archive, and restore them. Archiving a custom exercise or hiding a built-in exercise excludes it from new selections but never invalidates an existing reference. Hard deletion is not exposed.

Custom names are trimmed and must contain 1-80 visible characters. Names must be unique case-insensitively among custom exercises, including archived exercises. A custom name may match a localized built-in name because built-in names can change with locale; the UI distinguishes such results by muscle group and origin.

## Starter Catalog

The starter manifest contains the following built-in exercises. The English labels below define product meaning; Spanish labels are complete translations of the same stable entries.

| Muscle group | Exercises |
|---|---|
| Chest | Barbell Bench Press; Incline Barbell Bench Press; Dumbbell Bench Press; Incline Dumbbell Bench Press; Chest Press; Cable Fly; Pec Deck; Push-Up |
| Upper back | Barbell Row; T-Bar Row; Chest-Supported Row; Seated Cable Row; Machine Row; Reverse Fly |
| Lats | Pull-Up; Chin-Up; Lat Pulldown; Single-Arm Lat Pulldown; Straight-Arm Pulldown; Dumbbell Pullover |
| Shoulders | Barbell Overhead Press; Dumbbell Shoulder Press; Machine Shoulder Press; Arnold Press; Dumbbell Lateral Raise; Cable Lateral Raise |
| Biceps | Barbell Curl; Dumbbell Curl; Incline Dumbbell Curl; Preacher Curl; Cable Curl; Hammer Curl |
| Triceps | Cable Triceps Pushdown; Overhead Cable Triceps Extension; Dumbbell Overhead Triceps Extension; Skull Crusher; Close-Grip Bench Press; Dip |
| Forearms | Wrist Curl; Reverse Wrist Curl; Reverse Curl; Farmer's Carry |
| Quads | Back Squat; Front Squat; Leg Press; Hack Squat; Leg Extension; Bulgarian Split Squat; Walking Lunge |
| Hamstrings | Romanian Deadlift; Seated Leg Curl; Lying Leg Curl; Good Morning; Nordic Hamstring Curl |
| Glutes | Barbell Hip Thrust; Glute Bridge; Cable Glute Kickback; Step-Up; Hip Abduction Machine |
| Calves | Standing Calf Raise; Seated Calf Raise; Leg Press Calf Raise |
| Adductors | Hip Adduction Machine; Copenhagen Plank; Sumo Squat |
| Core | Cable Crunch; Crunch; Hanging Leg Raise; Reverse Crunch; Ab Wheel Rollout; Plank |
| Lower back | Deadlift; Back Extension; Reverse Hyperextension |

Adding, removing, renaming, or regrouping a built-in entry after release is a catalog data migration. Existing stable IDs and references must be preserved.

## Consumer Contract

Downstream modules receive one interface with these semantics:

- List available exercises in deterministic muscle-group order and localized-name order within each group.
- Search display names case-insensitively and accent-insensitively in the current locale.
- Filter by zero or one muscle group; no filter includes every group.
- Resolve any known exercise by ID, including a hidden built-in or archived custom exercise referenced by existing data.
- Observe catalog changes without requiring an app restart.
- Create a custom exercise from a valid name and muscle group and return its stable ID.
- Update only custom exercise names and muscle groups.
- Set availability for either origin: hidden/restored for built-ins and archived/restored for custom exercises.
- Reject invalid input, duplicate custom names, unknown IDs, and attempts to edit built-in definitions with explicit machine-readable reasons.
- Surface persistence failures explicitly. A failed mutation must leave the previously durable catalog state active.

The public contract follows this shape; exact storage and React provider details remain private:

```ts
export type ExerciseId = string & { readonly __brand: "ExerciseId" };

export type MuscleGroup =
  | "chest"
  | "upper-back"
  | "lats"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "adductors"
  | "core"
  | "lower-back";

export type CatalogExercise = Readonly<{
  id: ExerciseId;
  displayName: string;
  muscleGroup: MuscleGroup;
  origin: "builtin" | "custom";
  isAvailable: boolean;
}>;

export type CatalogMutationFailure =
  | "invalid-input"
  | "duplicate-name"
  | "not-found"
  | "immutable-builtin"
  | "persistence-error";
```

Consumers treat IDs as opaque and must not infer origin, label, muscle group, or ordering from an ID.

## User Experience

The dedicated catalog screen:

- Opens with available exercises grouped in the fixed muscle-group order.
- Provides a search field and a single muscle-group filter that can be combined.
- Shows each exercise's localized muscle-group label and distinguishes built-in from custom entries without relying on color alone.
- Provides a clear empty state when search and filter criteria have no matches.
- Lets the trainee create a custom exercise with a name and required muscle group.
- Lets the trainee edit, archive, and restore custom exercises.
- Lets the trainee hide and restore built-in exercises.
- Provides an explicit view of unavailable exercises so hidden and archived entries remain recoverable.
- Keeps the prior durable state visible and offers retry after load or mutation failure.

The inline picker used by routine programming:

- Searches and filters the same available catalog.
- Excludes hidden and archived exercises from new selections.
- Returns one stable exercise ID when selected.
- Offers an inline custom-exercise action that collects the same required fields and validation as the dedicated screen.
- Returns the newly created exercise as the current selection after a successful save.

All controls use project-maintained Gluestack components where available, expose accessible names, states, and errors, preserve logical focus after dialogs and mutations, provide at least 44 by 44 point touch targets, and remain usable at supported iOS and Android text scaling sizes.

## Persistence Invariants

- Built-in definitions and translation keys ship as a versioned application manifest; localized display names are not copied into SQLite.
- Durable storage contains custom exercise definitions and availability overrides for built-ins.
- Every custom exercise ID is generated locally, collision-resistant, stable, and independent of its name.
- Name and muscle-group edits update an existing custom exercise in place; they never create a replacement identity.
- Built-in visibility and custom availability changes are idempotent.
- Hidden and archived exercises remain resolvable by ID.
- No catalog action cascades into routine prescriptions, equipment contexts, or workout history.
- Persisted rows are validated when read. Invalid rows are not exposed as valid exercises and produce a recoverable catalog load error rather than silently changing identity or classification.
- Multi-row mutations and migrations are atomic.
- Schema changes use ordered, versioned migrations and preserve all valid IDs and references.
- The exact SQL DDL and migration sequence are defined in the approved implementation plan before code is written.

## Tech Stack

- Expo SDK 57, React Native 0.86, React 19.2, and Expo Router 57.
- TypeScript 6 with strict mode.
- `expo-sqlite` for durable local persistence through the existing shared database and migration system.
- Zod 4 for persisted-data and form-boundary validation.
- `expo-localization`, i18next, and react-i18next for English/Spanish selection and English fallback.
- Project-maintained Gluestack UI components for interactive controls.
- Jest with `jest-expo` and React Native Testing Library for unit and component tests.

No new runtime dependency is authorized by this spec.

## Commands

```sh
# Development
bunx expo start
bunx expo start --ios
bunx expo start --android

# Verification
bun run test -- --runInBand
bun run test -- --coverage --runInBand
bunx expo lint
bunx tsc --noEmit

# Native bundle checks
bunx expo export --platform ios --output-dir dist/ios
bunx expo export --platform android --output-dir dist/android
```

## Project Structure

```text
src/app/                                  Expo Router route files only
src/app/(app)/exercises/                  Thin catalog route files
src/features/exercise-catalog/            Module implementation
src/features/exercise-catalog/model/      IDs, muscle groups, validation, manifest contract
src/features/exercise-catalog/data/       SQLite repository and built-in manifest adapter
src/features/exercise-catalog/ui/         Catalog screen, picker, forms, and states
src/features/exercise-catalog/__tests__/  Unit, repository, contract, and component tests
src/db/                                   Shared ordered database migrations
src/i18n/                                 English and Spanish catalog resources
```

Tests and non-route code must not live under `src/app/`, because every file there is interpreted as an Expo Router route.

## Code Style

Use named exports for domain contracts, camelCase for values and functions, PascalCase for React components and types, double quotes, semicolons, and explicit return types at module boundaries. Keep catalog normalization, validation, filtering, and sorting pure and independent of React or persistence.

```ts
export function filterExercises(
  exercises: readonly CatalogExercise[],
  query: string,
  muscleGroup: MuscleGroup | null,
): CatalogExercise[] {
  const normalizedQuery = normalizeSearchText(query);

  return exercises.filter(
    (exercise) =>
      exercise.isAvailable &&
      (muscleGroup === null || exercise.muscleGroup === muscleGroup) &&
      normalizeSearchText(exercise.displayName).includes(normalizedQuery),
  );
}
```

User-facing strings, muscle-group labels, and built-in names must use translation keys. Custom names must render as entered after trimming. SQL values must use bound parameters; do not interpolate runtime values into SQL.

## Testing Strategy

- Unit test custom-name validation, every muscle-group value, case-insensitive duplicate detection, accent-insensitive search, availability filtering, stable sorting, and immutable built-in rules.
- Validate the starter manifest for unique stable IDs, one valid muscle group per entry, complete English and Spanish keys, deterministic ordering, and the exact entries in this spec.
- Contract test repository reads and every mutation for success, idempotency, invalid persisted rows, duplicate names, unknown IDs, failed reads, failed writes, and transaction rollback.
- Component test catalog loading, grouping, search, muscle filtering, combined search/filter, no-results state, custom create/edit/archive/restore, built-in hide/restore, validation errors, persistence failures, and retry behavior.
- Component test the inline picker for selection, hidden/archived exclusion, inline creation, cancellation, save failure, and returning the new stable ID.
- Test immediate updates in mounted consumers and resolution of unavailable exercises by ID.
- Test English, Spanish, and unsupported-locale fallback without snapshot tests.
- Manually verify catalog persistence across a force-quit/relaunch on one iOS and one Android target because mocked native tests do not prove on-device SQLite behavior.
- Manually verify VoiceOver and TalkBack navigation, announcements, focus restoration, error association, touch targets, and text scaling on the dedicated screen and inline picker.
- Require 100% branch coverage for model validation, manifest validation, filtering, and sorting, and at least 90% line and branch coverage for `src/features/exercise-catalog/` as a whole.
- Before review, run tests, coverage, lint, typecheck, and both native bundle checks from the Commands section.

## Boundaries

- Always: Preserve stable exercise IDs; require one valid muscle group; keep catalog operations local and offline; validate user and persisted input; use bound SQL parameters; expose loading and persistence errors; localize built-in content and visible UI in English and Spanish; keep hidden and archived entries recoverable; preserve accessible labels, states, focus order, focus restoration, text scaling, and touch targets; run every verification command before review.
- Ask first: Change the muscle-group taxonomy or starter manifest; allow multiple primary or secondary muscle groups; expose hard deletion; change built-in editability; change custom-name uniqueness; add dependencies; alter an established database migration; change CI or native build configuration.
- Never: Derive identity from an exercise name or translation; translate trainee-entered custom names; cascade catalog visibility or edits into deletion of routines, equipment mappings, or history; silently repair an invalid row into a different exercise; require network access; put tests or non-route modules in `src/app/`; edit generated native `ios/` or `android/` directories; commit secrets; remove or skip failing tests to pass verification.

## Success Criteria

- [ ] A fresh install shows every starter exercise in the specified muscle group with complete English and Spanish names and English fallback for unsupported locales.
- [ ] The trainee can search exercise names case-insensitively and accent-insensitively, filter by one muscle group, combine search and filtering, and clear both controls.
- [ ] The trainee can create a valid custom exercise from the dedicated screen or inline picker and immediately select the same stable exercise from any workout.
- [ ] Blank, overlong, invalid-group, and duplicate custom exercise submissions are rejected with localized field-level errors and do not change durable state.
- [ ] Renaming or regrouping a custom exercise preserves its ID and immediately updates every mounted consumer.
- [ ] Built-in definitions cannot be renamed or regrouped; built-ins can be hidden/restored and custom exercises can be archived/restored.
- [ ] Hidden and archived exercises disappear from new selections but remain resolvable for existing prescriptions, equipment contexts, and history.
- [ ] Catalog state and custom IDs survive a force-quit/relaunch with no network connection.
- [ ] A failed load or mutation preserves the prior durable state and presents a recoverable localized error.
- [ ] The dedicated catalog and inline picker are operable and announced correctly with iOS VoiceOver and Android TalkBack, including focus restoration and supported text scaling.
- [ ] The consumer contract is covered by automated tests and usable by later modules without importing route components, translation resources, or SQLite details.
- [ ] Tests, coverage thresholds, lint, typecheck, and iOS/Android bundle checks all pass.

## Open Questions

None.
