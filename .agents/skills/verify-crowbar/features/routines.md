# Routines

A Routine is a gym-agnostic plan of Exercises with Targets (warm-ups, sets × reps, effort, rest). The Workout tab lists Routines; each opens in the Routine editor.

## Sub-features

- Create: "New Routine" toolbar "+", or "Create your first Routine" when the list is empty. Both open the editor on a new row.
- Name: the editor's title field; an empty name shows as "New Routine".
- Add Exercise: "add, Add Exercise" opens the picker (search, `Create “<name>”`, `Unhide “<name>”`); Exercises already in the Routine are marked "In Routine".
- Targets per Exercise card: Warm-up sets, Working sets × reps, Effort (RIR or RPE per Settings), Rest; "Remove <exercise>".
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

## Gotchas

- **Open bug #66 (2026-10-13):** after picking an Exercise, the editor is replaced by a Render Error, `[Worklets] Cannot copy value of type CubicBezierEasing` in `Row` (`components/reorderable-list.tsx:92`). The `routine_exercise` row is still written. A fix is proved when `1-after-add` shows the card instead.
- The name field saves on every keystroke; fast input loses characters, which is why `cv type` is paced. Check the field's value in `cv tree` after typing.
- After naming, the TextField's value is the name, not "Routine name"; target it with `--value "<current name>"`.
- Long-press menus need a press-and-hold: `axe touch` with a hold (see `axe touch --help`), not `tap`.
- `Workout` is both the tab (RadioButton) and the editor's back button (Button).
