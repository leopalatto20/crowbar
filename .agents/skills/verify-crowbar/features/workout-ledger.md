# Empty Workout and the Ledger

Starting a Workout opens the Ledger, the logging screen, as a modal over the tabs: Exercise cards with set rows (load, reps, effort), a Rest bar after each confirmed Working set, and Finish/Discard. Only one Workout runs at a time, and a Workout left in progress reopens after the app is killed.

## Sub-features

- First start: no Gym yet, so the alert "Where are you training?" ("Progress is tracked separately at each Gym.") asks for a Gym name (placeholder "Gym name", buttons Cancel/Start). The field takes focus by itself (#70).
- Later starts: go straight to the Ledger at the last-used Gym.
- Workout in progress: "Start empty Workout" asks "A Workout is in progress" ("Discarding it deletes its logged sets.") with "Resume current", "Discard and start new", "Cancel".
- Ledger: titled "Workout" (or the Routine name), first row the Gym chip (`Button` "Gym: <Gym>. Tap to change", see [gyms.md](gyms.md)) and `started <time>`, "Add Exercise" (picker marks "In Workout"), "Add set", per-set "Complete set"/"Reopen set", warm-up toggle ("Working set, tap to make warm-up" / "Warm-up set, tap to make working").
- Ghosts: the load, reps and effort fields show the previous Workout's set at the same Station as grey placeholder ghosts (`60`, `5`, `2`). "Complete set" on untouched fields logs the ghosts. Set rows are set number, load, reps, effort and the confirm button: the live Ledger has no "Last here" column (#89). Edit mode (History's Edit, Log a past Workout) and read mode still show it, between the set number and the load.
- Load types (#38): the load column header and ghosts follow the Exercise's Load type and the Station's unit.
  - External: header `KG`/`LB`/`LVL`; a Stack-level Station's ghost is the level (`7`).
  - Bodyweight (Pull-Up): header `+KG`; an empty or 0 load reads "BW" (placeholder), and "Complete set" with it empty logs 0. A new Bodyweight Station is kg when the default unit is Stack level. History's "Last here" reads `BW × 8` / `BW +20 × 6`.
  - Assisted (Machine Assisted Pull-Up/Dip): header `−KG`/`−LVL`, assistance typed as a positive number; History's "Last here" reads `BW −30 × 8` / `BW −L3 × 8`.
  - Unilateral (Dumbbell Bulgarian Split Squat): reps header `REPS/SIDE`; History's "Last here" reads `L5 × 10/side`.
  - A quiet hint line under the name for barbell ("total incl. bar"), dumbbell ("per dumbbell") and kettlebell ("per kettlebell") Exercises only.
- Exercise menu (#39): the Exercise name is a `PopUpButton` "<Exercise>. Opens its menu"; on iOS a grey `chevron.down` follows the last word of the name, wrapped lines included (#120), and isn't in the tree, so judge it by `shot`. The menu has "Switch Station" (a submenu, only once the Exercise has a Station at this Gym, so after its first logged set or note) and "Add machine notes" / "Edit machine notes".
  - Switch Station lists the Gym's labelled Stations for the Exercise (checkmark on the current one) and "New Station…". A lone Station is unnamed, so the first "New Station…" opens the "New Station" alert ("Name both so you can tell them apart.") with fields "The one you've used" and "The new one"; later ones show only "The new one". Adding moves the Exercise and its sets onto the new Station.
  - Station chip: a pill with the label (`Station: <label>`) under the name, only while the Gym holds more than one Station for the Exercise.
  - Switching moves the Exercise's sets and changes the ghosts to the other Station's last Workout; the next Workout at the Gym starts on the Station last used.
  - Mid-Workout changes (#40): "Swap Exercise" (between Switch Station and the notes item) opens the picker titled "Swap Exercise"; the slot keeps its Target line and set rows, and the ghosts follow the new Exercise's Station. It's disabled while any set of the Exercise is confirmed. "Move Up" / "Move Down" (disabled at the ends) reorder the Ledger, and "Remove from Workout" (destructive) drops the Exercise at once, or asks "Remove <Exercise>?" ("Its logged sets will be deleted.", "Remove from Workout" / "Keep logging") when a set is confirmed. None of these touch the Routine. In a Workout started from a Routine, each one is logged in `workout_edit` (`kind`, `routine_exercise_id`, `exercise_id` for a Swap, `workout_exercise_id` for a Swap, Add or Move). An Exercise left unlogged at finish takes its Swap, Add and Move rows with it; a Remove stays.
  - Machine notes: a pin line under the name (`Button` labelled with the notes), tap to edit in place; Return or blur saves to the Station (`station.notes`), and blank clears. Notes follow the Station, so switching shows the other Station's notes.
- Rest card (#50): confirming a Working set in the Workout in progress shows `Rest · <exercise>`, a countdown (the slot's rest Target, else Settings' Default rest), a progress bar, and "−15", "+15", "Skip". It's one `rest` row (`set_id`, `started_at`, `ends_at`), never part of history.
  - −15 / +15 move `ends_at` only; the Target is untouched. "Skip" deletes the row.
  - At zero the card reads `Rest over · <exercise>` with an orange `+0:05` counting up and a single "Dismiss" (deletes the row).
  - Confirming another set replaces the row; "Reopen set" on the set that started it deletes it. Warm-ups start none (one confirmed during "Rest over" ends it). Finish and Discard end it.
  - Survives `cv launch` mid-countdown. Minimized, the Workout bar's value becomes `Resting, 0:28 left` (blue time) until zero, then elapsed again.
  - iOS Live Activity (#52): while the row exists, a display-only activity shows `Rest · <exercise>`, a self-ticking countdown and a progress bar on the lock screen and Dynamic Island. It's outside the app's accessibility tree, so judge it by `shot` after `axe button home` (compact island; long-press the island at `-x 201 -y 32` to expand) or `axe button lock` then `axe button home` (lock screen banner). The first one asks "Allow Live Activities from crowbar?" on the lock screen, and later "Always Allow".
    - ±15 updates the same activity; a Rest on another Exercise ends it and starts a new one. Skip, Reopen, Finish and Discard end it. It ends at zero while the app's JS runs (the sim keeps it alive ~30s in the background), else on the next foreground.
    - Tapping it opens `crowbar://rest?workoutExerciseId=<id>`, which reopens the Ledger (even minimized) scrolled to that Exercise.
    - ActivityKit's own log proves start/update/end: `xcrun simctl spawn booted log show --last 10s --predicate 'subsystem == "com.apple.activitykit" AND process == "crowbar"' | grep -i "requesting an activity\|updating activity\|ending activity"`.
- Finish: toolbar "Finish" opens the "Finish Workout" sheet ("Every set is logged.", `<n> unlogged sets will be discarded.`, or "Nothing is logged, so this Workout won’t be saved.") and an "End Workout" button that returns to the Workout tab.
- Discard: "More" menu, then "Discard Workout"; asks "Discard this Workout?" ("Its logged sets will be deleted.", "Discard Workout" / "Keep logging") only if a set is confirmed, otherwise discards at once.
- Minimize: the "Minimize" chevron (top left) or a swipe down closes the Ledger without ending the Workout, committing a value typed but not yet committed. The Workout bar then sits above the tab bar on every tab (iOS 26: the tab bar's accessory) as a `Button` labelled with the Routine name or "Workout", its value the live elapsed time (`0:42`, `1:02:03` past an hour). Tapping it reopens the Ledger. The bar disappears once the Workout is finished or discarded.
- Resume after kill: `cv launch` with a Workout in progress reopens the Ledger over the tabs, maximized.

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
cv tap Minimize --element-type Button       # Workout bar: Button "Workout", value = elapsed
cv tap History --element-type RadioButton && cv shot 2a-bar-on-history
cv tap Workout --element-type Button        # the bar, not the tab (a RadioButton)
cv wait "add, Add Exercise" 10
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

Stations (#39), continuing from a Workout with Barbell Bench Press:

```sh
cv tap "Complete set" --element-type Button          # the first set creates the Station
cv tap "Barbell Bench Press. Opens its menu"
cv tap "Add machine notes" --element-type Button
cv type "Seat 4, pin 7" && axe key 40 --udid <udid>  # Return saves
cv tap "Barbell Bench Press. Opens its menu" && cv tap "Switch Station" --element-type Button
cv tap "New Station…" --element-type Button && cv wait "New Station" 5
cv type "Hammer"                                     # "The one you've used" has focus
cv tap --value "The new one" --element-type TextField && cv type "Cybex"
cv tap Add --element-type Button                     # chip "Station: Cybex"
cv save-db "select label, notes from station order by label"   # Cybex | ; Hammer | Seat 4, pin 7
```

Then switch back to Hammer, finish, and start again: the new Ledger shows the Hammer chip, its notes, and ghosts from it.

## Gotchas

- Swiping down on the Ledger to scroll back up minimizes it instead (reopen with the Workout bar). Scroll up with short swipes that start mid-screen, or reopen. Cards past the third push "Add Exercise" under the bottom edge; swipe up first.
- Ghost placeholders stay bare numbers ("20", "3") under the signed header; only History's "Last here" column reads `BW +20`.

- To swipe the Ledger down, start the drag at the sheet's top edge and go slowly: `axe swipe --start-x 200 --start-y 120 --end-x 200 --end-y 700 --duration 1.0 --delta 10 --udid <udid>`. Faster swipes, or ones starting lower on the content, leave it open on the simulator.
- "Workout" labels the tab (`RadioButton`), the Workout tab's heading, and the Workout bar (`Button`, value the elapsed time). Pass `--element-type`.

- Do not create the Gym through SQL to skip the prompt: that's not the user path, and it would hide a regression of #65 (a SwiftUI dialog without a trigger never presents).
- Ledger set fields are React Native `TextInput`s whose placeholder is the ghost value or "–". Find them by frame in `cv tree` and tap the centre with `cv tap --pre-delay 0 -x <x> -y <y>` (a leading flag stops `cv` from treating `-x` as a label). The coordinates above hold only for the first card of an empty Workout; a Routine's Target line or earlier cards push rows down.
- `cv tree` shows a ghost placeholder exactly like a typed value (`TextField  60`). Only the `shot` tells them apart: ghosts are grey.
- Number pads have no Return key; tap elsewhere or use the toolbar Finish (it dismisses the keyboard first, so typed values are committed).
- "Discard Workout" labels both the More menu action and the confirmation's destructive button. Wait for "Discard this Workout?" before tapping it a second time, or one `cv tap` can land on the alert and discard.
