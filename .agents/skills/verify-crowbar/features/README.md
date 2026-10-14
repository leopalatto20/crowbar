# Crowbar feature map

One file per user-facing feature. Each says what it is, how a user reaches it, how to drive it with `crowbar-verify` (`cv` below), and what end state proves it. Status reflects the last verified run; update it when you verify or when the app changes.

| Feature                               | File                                       | Entry point                        | Status (2026-10-13)                                                |
| ------------------------------------- | ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------ |
| Exercise library and Custom Exercises | [exercise-library.md](exercise-library.md) | Exercises tab                      | Verified end to end                                                |
| Routines                              | [routines.md](routines.md)                 | Workout tab, Routines section      | Create and name work; adding an Exercise hits a Render Error (#66) |
| Empty Workout and the Ledger          | [workout-ledger.md](workout-ledger.md)     | Workout tab, "Start empty Workout" | Blocked by #65: Gym name prompt never appears                      |
| Settings                              | [settings.md](settings.md)                 | Settings tab                       | Effort scale verified (writes, survives relaunch)                  |

History is an empty state ("No Workouts yet.") until issue #42 lands. Add a file for it then.

Labels come from `apps/native/lib/i18n/en.ts`. Domain terms (Gym, Routine, Workout, Station, Target) are defined in `GLOSSARY.md`.
