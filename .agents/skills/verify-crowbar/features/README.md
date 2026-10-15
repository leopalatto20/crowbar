# Crowbar feature map

One file per user-facing feature. Each says what it is, how a user reaches it, how to drive it with `crowbar-verify` (`cv` below), and what end state proves it. Status reflects the last verified run; update it when you verify or when the app changes.

| Feature                               | File                                       | Entry point                        | Status (2026-10-14)                                                                                                     |
| ------------------------------------- | ------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Exercise library and Custom Exercises | [exercise-library.md](exercise-library.md) | Exercises tab                      | Verified end to end; Unhide unreachable (no way to hide in the UI)                                                      |
| Routines                              | [routines.md](routines.md)                 | Workout tab, Routines section      | Verified end to end, including Targets, start, last run, list actions                                                   |
| Empty Workout and the Ledger          | [workout-ledger.md](workout-ledger.md)     | Workout tab, "Start empty Workout" | Verified end to end, including Gym prompt, resume, minimize, Finish, load types (#38), Stations and machine notes (#39) |
| Settings                              | [settings.md](settings.md)                 | Settings tab                       | Verified: both settings write, survive relaunch, reach the Ledger                                                       |
| Gyms                                  | [gyms.md](gyms.md)                         | Ledger Gym chip; Settings, Gyms    | Verified on iOS: switch, New Gym, rename, counted delete cascade                                                        |

History is an empty state ("No Workouts yet.") until issue #42 lands. Add a file for it then.

Labels come from `apps/native/lib/i18n/en.ts`. Domain terms (Gym, Routine, Workout, Station, Target) are defined in `GLOSSARY.md`.
