# Source rooted under `src`

## Context

Crowbar's hand-authored and runtime-relevant source was split between root-level
folders and `src/`. Tests, test helpers, persistence code, reusable UI, feature
code, and runtime migration assets benefit from one explicit source boundary.

## Decision

Hand-authored and runtime source is rooted at `src/`, including tests and test
helpers. Expo Router entrypoints remain under `src/app/`. Reusable UI is under
`src/components/ui/`, app shell tabs are under `src/components/app/`, and
catalog feature code is under `src/features/catalog/`. Persistence is under
`src/db/`, with runtime migrations under `src/db/migrations/`. Legacy theme
implementation is isolated under `src/legacy/theme/`.

## Consequences

This creates a single explicit source boundary while keeping test, configuration,
and generated concerns in their appropriate separate locations. The tradeoff is
that source paths are more deliberate and root-level tooling configuration must
refer into `src/`; in return, runtime and test topology is consistent and easy
to discover.
