# Capability Map: Progressive Gym Adapters

| Module id | Responsibility | Depends on |
|---|---|---|
| `training-preferences` | Store and expose the trainee-wide RPE or RIR choice | - |
| `routine-programming` | Maintain one active routine with ordered workouts and prescribed exercises, target sets, rep ranges, and effort targets | `training-preferences` |
| `gym-adapters` | Maintain gyms and exercise-specific equipment contexts, labels, load representations, multiple valid contexts, and explicit defaults | `routine-programming` |
| `workout-logging` | Select a workout and gym, resolve or capture equipment per exercise, support one-session substitutions, and record immutable sets | `training-preferences`, `routine-programming`, `gym-adapters` |
| `contextual-history` | Show prior sets only for the exact equipment context selected during logging | `gym-adapters`, `workout-logging` |

Build order: `training-preferences` -> `routine-programming` -> `gym-adapters` -> `workout-logging` -> `contextual-history`

## Cross-Cutting Constraints

- Use local, offline-capable persistence.
- Support English and Spanish with English fallback.
- Target iOS and Android only.
