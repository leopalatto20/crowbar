# Capability Map: Progressive Gym Adapters

| Module id | Responsibility | Depends on |
|---|---|---|
| `training-preferences` | Store and expose the trainee-wide RPE or RIR choice | - |
| `exercise-catalog` | Maintain reusable exercise identities, fixed muscle groups, localized starter exercises, and custom exercise lifecycle | - |
| `routine-programming` | Maintain one active routine with ordered workouts and prescriptions referencing reusable exercises, target sets, rep ranges, and effort targets | `training-preferences`, `exercise-catalog` |
| `gym-adapters` | Maintain gyms and exercise-specific equipment contexts, labels, load representations, multiple valid contexts, and explicit defaults | `exercise-catalog` |
| `workout-logging` | Select a workout and gym, resolve or capture equipment per exercise, support one-session substitutions, and record immutable sets | `training-preferences`, `exercise-catalog`, `routine-programming`, `gym-adapters` |
| `contextual-history` | Show prior sets only for the exact equipment context selected during logging | `gym-adapters`, `workout-logging` |

Build order: `training-preferences` + `exercise-catalog` -> `routine-programming` -> `gym-adapters` -> `workout-logging` -> `contextual-history`

## Cross-Cutting Constraints

- Use local, offline-capable persistence.
- Support English and Spanish with English fallback.
- Target iOS and Android only.
