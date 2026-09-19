# Coding standards

## Architecture

- Keep application TypeScript, TSX, and colocated tests under `src`.
- Keep Expo Router route files thin. Routes compose feature components and navigation; they do not contain business rules or persistence logic.
- Put generated and shared presentational UI in `src/components/ui`.
- Put stateful workflows in `src/features/<feature>`. Start feature directories flat; add internal `components`, `hooks`, or `stores` directories only when the feature has enough files to need them.
- Put domain types and business rules in `src/domain`. Domain code must not import React, React Native, Expo, database, or UI modules.
- Put database access behind repositories in `src/data`. UI components must not query SQLite directly.
- Put localization setup, resources, and regional formatting in `src/i18n`.
- Keep Zustand limited to drafts, timers, and transient UI state. Persisted application data belongs in SQLite.
- Prefer pure functions for domain decisions and calculations.
- Dependencies should point inward: UI and data may depend on domain code, but domain code must not depend on them.

## TypeScript

- Keep TypeScript strict. Do not introduce `any`, `@ts-ignore`, or non-null assertions without documenting why the type system cannot represent the case.
- Validate untrusted, imported, and persisted data at system boundaries.
- Model domain states with explicit types or discriminated unions instead of booleans with ambiguous combinations.

## React and UI

- Prefer published or generated Gluestack components over hand-rolled primitives.
- Use NativeWind as the shared styling approach. Do not introduce another styling system.
- Separate stateful feature logic from presentational components.
- Do not add `useMemo` or `useCallback` unless profiling or API semantics justify them.
- Every screen must handle loading, empty, error, and success states where applicable.
- Interactive controls must have accessible names, adequate touch targets, and visible disabled states.
- Support both iOS and Android. Do not add web-only behavior unless explicitly requested.

## Expo and dependencies

- Consult the Expo 57 documentation before changing Expo APIs or configuration.
- Do not add a dependency when the platform or an existing dependency already provides the required behavior.
- Do not edit generated files or generated migrations manually.

## Data and domain rules

- Preserve the historical context of recorded sets; do not derive historical values from mutable current configuration.
- Treat accepted ADRs as requirements, not suggestions.
- Changes that alter an accepted business rule require an ADR update and corresponding tests.
- Keep persisted-data changes backward compatible through explicit migrations.
- Use transactions for operations that must succeed or fail as one unit.

## Testing

- Add tests for new domain behavior and regressions.
- Every accepted business rule must have a domain or end-to-end test referencing its `BR-###` identifier.
- Test observable behavior rather than component implementation details.
- Mock system boundaries, not domain logic.
- Before completing a change, run lint, TypeScript checking, and relevant tests.

## Change discipline

- Make the smallest change that fully solves the problem.
- Do not refactor unrelated code in the same change.
- Follow existing patterns unless the change intentionally replaces them.
- Comments should explain constraints or non-obvious decisions, not restate the code.
- Update documentation when behavior, terminology, architecture, or setup changes.
