# Coding standards

## Architecture

- Keep Expo Router route files thin. Routes compose feature components and navigation; they do not contain business rules or persistence logic.
- Prefer pure functions for domain decisions and calculations.

## TypeScript

- Keep TypeScript strict. Do not introduce `any`, `@ts-ignore`, or non-null assertions without documenting why the type system cannot represent the case.

## React and UI

- Prefer published or generated Gluestack components over hand-rolled primitives.
- Use NativeWind as the shared styling approach. Do not introduce another styling system.
- Separate stateful feature logic from presentational components.
- Do not add `useMemo` or `useCallback` unless profiling or API semantics justify them.
- Every screen must handle loading, empty, error, and success states where applicable.
- Interactive controls must have accessible names, adequate touch targets, and visible disabled states.
- Support both iOS and Android. Do not add web-only behavior unless explicitly requested.

## Change discipline

- Make the smallest change that fully solves the problem.
- Do not refactor unrelated code in the same change.
- Follow existing patterns unless the change intentionally replaces them.
- Update documentation when behavior, terminology, architecture, or setup changes.
