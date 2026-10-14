# Exercise library and Custom Exercises

The Exercises tab lists every non-hidden Exercise, Built-in and Custom, grouped by Muscle group, with a search bar. The "+" toolbar button opens the New Exercise sheet to create a Custom Exercise.

## Sub-features

- Browse: sections per Muscle group (Chest, Lats, ...), then "No Muscle group" for Exercises without one.
- Search: header search field filters the list; no match shows `No Exercises match “<query>”.`
- Create Custom Exercise: Name, Equipment type, Load type, Unilateral, Muscle group; Save.
- Name collision: an existing name shows `“<name>” already exists.` with "Use it", or `“<name>” already exists but is hidden.` with "Unhide".
- The same sheet is reachable from the exercise picker's `Create “<name>”` row (Routine editor and Ledger), prefilled with the search text.

## How to get to it (user POV)

Tap the Exercises tab. Tap "+" (top right) for New Exercise. Tap the search bar to filter.

## Driving it with crowbar-verify

```sh
cv up --fresh && cv run custom-exercise
cv save-db "select count(*) as custom from exercise where built_in = 0"
cv tap Exercises --element-type RadioButton
cv tap "New Exercise"                              # toolbar "+"
cv tap --value Name --element-type TextField
cv type "Verify Press"
cv tap Other --element-type PopUpButton            # Equipment type menu (current value is its label)
cv tap Machine --element-type Button
cv shot 1-form-filled
cv tap Save --element-type Button
cv tap --value Search --element-type TextField
cv type "Verify"
cv shot 2-library-search
cv save-db "select name, equipment_type, load_type, unilateral, muscle_group, built_in, hidden from exercise where built_in = 0"
```

Proof: the sheet closes, the search shows "Verify Press" under "No Muscle group", and the row reads `machine | external | 0 | (null) | 0 | 0`.

## Gotchas

- Equipment type may be inferred from the typed name (`lib/exercise/infer.ts`), so the PopUpButton's label can change after typing. Read it from `cv tree` before tapping.
- Load type and Muscle group are PopUpButtons too, labelled with their current value ("External", "None").
- Built-in rows are `StaticText` in the library but `Button` with label `<name>, <muscle group>` in the picker sheet.
- The Exercises tab's search field and the sheet's Name field are both TextFields; always pass `--value`.
