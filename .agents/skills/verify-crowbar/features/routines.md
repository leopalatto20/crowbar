# Routines

A Routine is a gym-agnostic plan of Exercises with Targets (warm-ups, sets × reps, effort, rest). The Workout tab lists Routines; each opens in the Routine editor.

## Sub-features

- Create: "New Routine" toolbar "+", or "Create your first Routine" when the list is empty. Both open the editor on a new row.
- Name: the editor's title field; an empty name shows as "New Routine".
- Add Exercise: "add, Add Exercise" opens the picker (search, `Create “<name>”`, `Unhide “<name>”`); Exercises already in the Routine are marked "In Routine".
- Targets per Exercise card: Warm-up sets, Working sets × reps, Effort (RIR or RPE per Settings), Rest; "Remove <exercise>".
- Start: tap a row to open its Workout in the Ledger at the last-used Gym (the Gym prompt first if none exists; the "A Workout is in progress" alert if one is running). The Ledger is titled with the Routine name and each Exercise shows a `Target 3 × 5–7 · RIR 1–2 · rest 3:00` line; the Rest after a Working set lasts the slot's rest Target.
- Last run: a row whose Routine has a finished Workout shows `Last: today · <Gym>` (then `yesterday`, `3 days ago`, weeks, months, years).
- List actions: long-press a row for Edit, Duplicate (`<name> copy`), Delete; swipe left for Edit; toolbar "Edit"/"Done" toggles drag-to-reorder.

## How to get to it (user POV)

Workout tab, then the "+" at top right (or "Create your first Routine"). Existing Routines are rows under "Routines".

## Driving it with crowbar-verify

```sh
cv run routine
cv tap Workout --element-type RadioButton
cv tap "New Routine"
cv tap --value "Routine name" --element-type TextField
cv type "Push Day"
cv tap "add, Add Exercise"
cv tap --value "Search exercises" --element-type TextField
cv type "bench"
cv tap "Barbell Bench Press, Chest"
cv shot 1-after-add
cv save-db "select r.name, e.name as exercise, re.warmups, re.sets, re.rep_min, re.rep_max, re.rest_seconds from routine r left join routine_exercise re on re.routine_id = r.id left join exercise e on e.id = re.exercise_id"
cv tap Workout --element-type Button      # editor back button
cv shot 2-list
```

Proof: the editor's summary reads `1 exercise · 3 working sets`, the list shows "Push Day", and the row shows Barbell Bench Press with sets 3, reps 8-12.

To start it (after the steps above, with rest 3:00 and 2 warm-ups on the bench card):

```sh
cv tap "Push Day"                         # the row; tap starts, long-press opens the menu
cv wait "add, Add Exercise" 10 && cv shot 3-ledger
cv save-db "select w.routine_name, e.name, we.sets, we.rest_seconds, group_concat(s.kind) from workout w join workout_exercise we on we.workout_id = w.id join exercise e on e.id = we.exercise_id join \"set\" s on s.workout_exercise_id = we.id group by we.id"
```

Proof: the Ledger title is the Routine name, the bench card shows two "W" rows then 1-3, and the Target line sits under the name. After Finish → End Workout, the row reads `Last: today · <Gym>`. Deleting the Routine leaves the `workout` row with `routine_id` null and `routine_name` intact.

## Gotchas

- The Ledger's back button is labelled `(tabs)`.
- After tapping "New Routine", wait for the editor's `Routine name` field before typing: a tap that lands too early leaves a blank "New Routine" row behind.

- The name field saves on every keystroke; fast input loses characters, which is why `cv type` is paced. Check the field's value in `cv tree` after typing.
- After naming, the TextField's value is the name, not "Routine name"; target it with `--value "<current name>"`.
- Long-press menus need a press-and-hold: `axe touch` with a hold (see `axe touch --help`), not `tap`.
- `Workout` is both the tab (RadioButton) and the editor's back button (Button).
