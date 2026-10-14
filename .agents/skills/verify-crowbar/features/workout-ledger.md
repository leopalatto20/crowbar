# Empty Workout and the Ledger

Starting a Workout opens the Ledger, the logging screen: Exercise cards with set rows (load, reps, effort), a Rest bar after each confirmed Working set, and Finish/Discard. Only one Workout runs at a time, and a Workout left in progress reopens after the app is killed.

## Sub-features

- First start: no Gym yet, so the alert "Where are you training?" asks for a Gym name (placeholder "Gym name", buttons Cancel/Start).
- Later starts: go straight to the Ledger at the last-used Gym.
- Workout in progress: "Start empty Workout" asks "A Workout is in progress" with "Resume current", "Discard and start new", "Cancel".
- Ledger: header `<Gym> · started <time>`, "Add Exercise" (picker marks "In Workout"), "Add set", per-set "Complete set"/"Reopen set", warm-up toggle ("Working set, tap to make warm-up"), "Last here" ghost values from the previous Workout at the same Station.
- Rest bar: `Rest · <exercise>` with "−15", "+15", "Skip".
- Finish: toolbar "Finish" opens a sheet ("Every set is logged.", `<n> unlogged sets will be discarded.`, or "Nothing is logged, so this Workout won’t be saved.") and a Finish button that returns to the Workout tab.
- Discard: "More" menu, then "Discard Workout"; asks "Discard this Workout?" only if a set is confirmed.
- Resume after kill: `cv launch` with a Workout in progress reopens the Ledger over the tabs.

## How to get to it (user POV)

Workout tab, then "Start empty Workout". On first use, name the Gym, then Start.

## Driving it with crowbar-verify

```sh
cv up --fresh && cv run empty-workout
cv tap "Start empty Workout" --element-type Button
cv wait "Where are you training?" 5        # currently fails: see Gotchas
cv tap --value "Gym name" --element-type TextField
cv type "Home Gym"
cv tap Start --element-type Button
cv wait "Add Exercise" 10
cv shot 1-ledger
cv save-db "select g.name as gym, w.started_at, w.finished_at from workout w join gym g on g.id = w.gym_id"
cv launch                                   # kill and relaunch: the Ledger must reopen
cv wait "Add Exercise" 30 && cv shot 2-resumed
cv tap Finish --element-type Button
cv shot 3-finish-sheet
```

Proof: a `gym` row with the typed name, a `workout` row with `finished_at` null while logging, the Ledger reopening after `cv launch`, and `finished_at` set after Finish (a Workout with nothing logged is not saved).

## Gotchas

- **Open bug #65 (2026-10-13):** on a fresh install, tapping "Start empty Workout" sets the prompt's `visible` to true (confirmed with a temporary log), but the SwiftUI Alert (`components/gym-name-prompt.ios.tsx`) never appears. Nothing shows on screen or in the tree, and other tint in the list dims as if a modal were up. Further taps do nothing until relaunch. This blocks every Ledger path on a fresh install. Reproduced in both Expo Go and the development build on iOS 26.5.
- Do not create the Gym through SQL to get past it: that's not the user path, and it hides the bug.
- Ledger set fields are React Native `TextInput`s whose placeholder is the "Last here" ghost value or "–". Find them by frame in `cv tree`.
- Number pads have no Return key; tap elsewhere or use Finish (it dismisses the keyboard first, so typed values are committed).
