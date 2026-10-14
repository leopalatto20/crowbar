# Empty Workout and the Ledger

Starting a Workout opens the Ledger, the logging screen: Exercise cards with set rows (load, reps, effort), a Rest bar after each confirmed Working set, and Finish/Discard. Only one Workout runs at a time, and a Workout left in progress reopens after the app is killed.

## Sub-features

- First start: no Gym yet, so the alert "Where are you training?" ("Progress is tracked separately at each Gym.") asks for a Gym name (placeholder "Gym name", buttons Cancel/Start). The field takes focus by itself (#70).
- Later starts: go straight to the Ledger at the last-used Gym.
- Workout in progress: "Start empty Workout" asks "A Workout is in progress" ("Discarding it deletes its logged sets.") with "Resume current", "Discard and start new", "Cancel".
- Ledger: titled "Workout" (or the Routine name), first row `<Gym> · started <time>`, "Add Exercise" (picker marks "In Workout"), "Add set", per-set "Complete set"/"Reopen set", warm-up toggle ("Working set, tap to make warm-up" / "Warm-up set, tap to make working").
- Last here: the column shows the previous Workout's set at the same Station (`60 × 5`, or "–"), and the load and reps fields show it as grey placeholder ghosts. "Complete set" on untouched fields logs the ghosts.
- Rest bar: `Rest · <exercise>` with "−15", "+15", "Skip".
- Finish: toolbar "Finish" opens the "Finish Workout" sheet ("Every set is logged.", `<n> unlogged sets will be discarded.`, or "Nothing is logged, so this Workout won’t be saved.") and an "End Workout" button that returns to the Workout tab.
- Discard: "More" menu, then "Discard Workout"; asks "Discard this Workout?" ("Its logged sets will be deleted.", "Discard Workout" / "Keep logging") only if a set is confirmed, otherwise discards at once.
- Resume after kill: `cv launch` with a Workout in progress reopens the Ledger over the tabs.

## How to get to it (user POV)

Workout tab, then "Start empty Workout". On first use, name the Gym, then Start.

## Driving it with crowbar-verify

```sh
cv up --fresh && cv run empty-workout
cv tap "Start empty Workout" --element-type Button
cv wait "Where are you training?" 5 && cv shot 0-gym-prompt   # cursor already in "Gym name"
cv type "Home Gym"                          # no tap first: typing proves the field focused itself
cv tap Start --element-type Button
cv wait "add, Add Exercise" 10            # the button label carries its SF Symbol name
cv shot 1-ledger
cv save-db "select g.name as gym, w.started_at, w.finished_at from workout w join gym g on g.id = w.gym_id"
cv launch                                   # kill and relaunch: the Ledger must reopen
cv wait "add, Add Exercise" 10 && cv shot 2-resumed
cv tap "add, Add Exercise" --element-type Button
cv tap "Barbell Bench Press, Chest" --element-type Button
cv tap --pre-delay 0 -x 178 -y 248 && cv type 60   # KG field of set 1, by frame (see Gotchas)
cv tap --pre-delay 0 -x 240 -y 248 && cv type 5    # Reps field
cv tap "Complete set" --element-type Button
cv tap Finish --element-type Button
cv wait "Every set is logged." 5 && cv shot 3-finish-sheet
cv tap "End Workout" --element-type Button
cv wait "Start empty Workout" 10 && cv shot 4-workout-tab
cv save-db "select finished_at from workout"       # set now
cv tap "Start empty Workout" --element-type Button  # nothing logged this time
cv wait "add, Add Exercise" 10
cv tap Finish --element-type Button
cv wait "Nothing is logged, so this Workout won’t be saved." 5
cv tap "End Workout" --element-type Button
cv wait "Start empty Workout" 10
cv save-db "select count(*) as workouts, count(finished_at) as finished from workout"   # 1 | 1
cv tap "Start empty Workout" --element-type Button  # Ledger again: bench shows "60 × 5" ghosts
cv tap "add, Add Exercise" --element-type Button
cv tap "Barbell Bench Press, Chest" --element-type Button
cv tap "Complete set" --element-type Button        # logs the ghosts
cv tap More --element-type Button && cv tap "Discard Workout" --element-type Button
cv wait "Discard this Workout?" 5 && cv shot 5-discard-confirm
cv tap "Discard Workout" --element-type Button
cv wait "Start empty Workout" 10
cv save-db "select count(*) as workouts, count(finished_at) as finished from workout"   # still 1 | 1
```

Proof: a `gym` row with the typed name, a `workout` row with `finished_at` null while logging, the Ledger reopening after `cv launch`, `finished_at` set after "End Workout", and neither the empty second Workout nor the discarded third leaving a row.

## Gotchas

- Do not create the Gym through SQL to skip the prompt: that's not the user path, and it would hide a regression of #65 (a SwiftUI dialog without a trigger never presents).
- Ledger set fields are React Native `TextInput`s whose placeholder is the "Last here" ghost value or "–". Find them by frame in `cv tree` and tap the centre with `cv tap --pre-delay 0 -x <x> -y <y>` (a leading flag stops `cv` from treating `-x` as a label). The coordinates above hold only for the first card of an empty Workout; a Routine's Target line or earlier cards push rows down.
- `cv tree` shows a ghost placeholder exactly like a typed value (`TextField  60`). Only the `shot` tells them apart: ghosts are grey.
- Number pads have no Return key; tap elsewhere or use the toolbar Finish (it dismisses the keyboard first, so typed values are committed).
- "Discard Workout" labels both the More menu action and the confirmation's destructive button. Wait for "Discard this Workout?" before tapping it a second time, or one `cv tap` can land on the alert and discard.
