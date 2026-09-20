# Spec: Training Preferences

Module id: `training-preferences`

Status: Approved
Approved: 2026-09-19

Sources: `CAPABILITY-MAP.md`, `PRODUCT.md`, `docs/ideas/progressive-gym-adapters.md`, and `docs/intent/progressive-gym-adapters.md`

## Objective

Give the single local trainee an explicit, durable choice between RPE and RIR as Crowbar's app-wide effort metric. The choice is required on first launch, remains changeable from settings, and is exposed through a stable contract to `routine-programming` and `workout-logging`.

The selected metric controls how effort is entered and displayed. Changing the preference re-expresses existing effort values with `RPE + RIR = 10`; it never relabels an unchanged number or discards data. Valid values use half-step increments across the practical training ranges of RPE 5.0-10.0 and RIR 0.0-5.0.

This module includes:

- The first-run RPE/RIR choice.
- A settings control for changing the choice later.
- Local offline persistence for the choice.
- Effort conversion and validation rules used by downstream modules.
- English and Spanish copy with English fallback.

This module does not include routine targets, workout set entry, workout history, accounts, cloud sync, or per-routine/per-exercise effort preferences.

## Consumer Contract

Downstream modules receive one interface with these semantics:

- Read the current preference as `"rpe"`, `"rir"`, or `null` before the first explicit choice.
- Save only `"rpe"` or `"rir"`; saving the current value is idempotent.
- Observe preference changes without requiring an app restart.
- Validate half-step effort values against the selected metric's range.
- Convert between metrics with `convertedValue = 10 - sourceValue`; converting to the same metric returns the source value unchanged.
- Surface persistence failures explicitly to the calling UI. A failed write must not present the new preference as saved.
- Treat missing or unrecognized persisted values as `null` and require an explicit choice rather than inventing a default.

The storage schema, React provider shape, and state-management implementation are private to this module.

## Persistence Invariants

- The preference has zero or one durable row for the single local trainee.
- No row represents the unselected first-run state.
- The only durable values are `"rpe"` and `"rir"`.
- Saving replaces the singleton value atomically; partial or duplicate preference state is not observable.
- Schema changes use ordered, versioned migrations and preserve existing valid preferences.
- Persisted rows are validated when read. Missing or unrecognized values produce the unselected state; storage access failures remain errors.
- The exact SQL DDL and migration sequence are defined in the approved implementation plan before code is written.

## Tech Stack

- Expo SDK 57, React Native 0.86, React 19.2, and Expo Router 57.
- TypeScript 6 with strict mode.
- `expo-sqlite`, installed at the Expo SDK-compatible version, for durable local persistence and the shared database foundation used by later modules.
- Zod 4 for validation at persisted-data and form boundaries.
- `expo-localization`, i18next, and react-i18next for English/Spanish selection and English fallback.
- Jest with `jest-expo` and React Native Testing Library for unit and component tests.

The existing Node-oriented `sqlite` package is replaced by `expo-sqlite`. The unused AsyncStorage dependency is removed so local persistence has one owner.

## Commands

```sh
# One-time dependency setup
bun remove sqlite @react-native-async-storage/async-storage
bunx expo install expo-sqlite
bunx expo install jest-expo jest @types/jest @testing-library/react-native --dev

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
src/app/_layout.tsx                       App-level providers and route gating
src/features/training-preferences/        Module implementation
src/features/training-preferences/model/  Metric types, validation, conversion
src/features/training-preferences/data/   Persistence contract and SQLite adapter
src/features/training-preferences/ui/     First-run and settings UI
src/features/training-preferences/__tests__/  Module unit and component tests
src/db/                                   Shared database initialization and migrations
src/i18n/                                 i18next setup and en/es resources
```

Tests must not live under `src/app/`, because every file there is interpreted as an Expo Router route.

## Code Style

Use named exports for domain contracts, camelCase for values and functions, PascalCase for React components and types, double quotes, semicolons, and explicit return types at module boundaries. Keep conversion logic pure and independent of React or persistence.

```ts
export type EffortMetric = "rpe" | "rir";

const effortRanges: Record<EffortMetric, readonly [number, number]> = {
  rpe: [5, 10],
  rir: [0, 5],
};

export function isValidEffort(metric: EffortMetric, value: number): boolean {
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
```

User-facing strings must use translation keys. SQL values must use bound parameters; do not interpolate runtime values into SQL.

## Testing Strategy

- Unit test every conversion boundary and half-step validation rule, including identity conversion, RPE 5.0/10.0, RIR 0.0/5.0, valid half steps, invalid quarter steps, non-finite numbers, and out-of-range values.
- Contract test the repository for missing, valid, invalid, failed-read, and failed-write states.
- Component test the first-run gate, both choices, save failure behavior, settings changes, and immediate consumer updates with React Native Testing Library.
- Test English, Spanish, and unsupported-locale fallback copy without snapshot tests.
- Manually verify persistence across a force-quit/relaunch on one iOS and one Android target because mocked native tests do not prove on-device SQLite behavior.
- Require 100% branch coverage for conversion and validation functions and at least 90% line and branch coverage for `src/features/training-preferences/` as a whole.
- Before review, run tests, coverage, lint, typecheck, and both native bundle checks from the Commands section.

## Boundaries

- Always: Require an explicit first choice; keep preference state local and offline; validate UI and persisted input; use bound SQL parameters; expose loading and persistence errors; localize visible copy in English and Spanish; preserve accessible labels, roles, focus order, and touch targets; run all verification commands before review.
- Ask first: Change the RPE/RIR equation or valid ranges; change the single-trainee/global-preference model; add dependencies not named in this spec; alter an established database migration; change CI or native build configuration.
- Never: Select a default metric silently; store separate conflicting preferences; relabel existing values without conversion; require network access; put tests or non-route modules in `src/app/`; edit generated native `ios/` or `android/` directories; commit secrets; remove or skip failing tests to pass verification.

## Success Criteria

- [ ] On a fresh install or missing/invalid preference, Crowbar shows one first-run choice with neither RPE nor RIR preselected and does not enter the main app until the trainee chooses one.
- [ ] Choosing RPE or RIR saves successfully, enters the app, and restores the same preference after a force-quit/relaunch with no network connection.
- [ ] A settings control changes the preference, and mounted consumers observe the new value without an app restart.
- [ ] Changing the preference displays equivalent values using `RPE + RIR = 10`, including 8.0 RPE as 2.0 RIR and 7.5 RPE as 2.5 RIR.
- [ ] RPE accepts only 5.0-10.0 and RIR accepts only 0.0-5.0, both in 0.5 increments; invalid values cannot cross the module boundary.
- [ ] A failed preference write leaves the prior durable preference active and presents a recoverable localized error.
- [ ] English and Spanish contain complete first-run, settings, validation, and error copy; any unsupported locale falls back to English without exposing translation keys.
- [ ] The first-run and settings controls are operable and announced correctly with iOS VoiceOver and Android TalkBack.
- [ ] The consumer contract is covered by automated tests and is usable by later modules without importing route components or SQLite details.
- [ ] Tests, coverage thresholds, lint, typecheck, and iOS/Android bundle checks all pass.

## Open Questions

None.
