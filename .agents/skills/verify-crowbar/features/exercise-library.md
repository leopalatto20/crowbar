# Exercise library and Custom Exercises

The Exercises tab lists every non-hidden Exercise, Built-in and Custom, grouped by Muscle group, with a search bar. The "+" toolbar button opens the New Exercise sheet to create a Custom Exercise.

## Sub-features

- Browse: sections per Muscle group (Chest, Lats, ...), then "No Muscle group" for Exercises without one.
- Search: header search field filters the list; no match shows `No Exercises match “<query>”.`
- Create Custom Exercise: Name (focused on open), Equipment type, Load type, Unilateral, Muscle group; Save, disabled while the name is blank or taken. Typing the name infers Equipment type from its first word, Load type from "assisted" or Bodyweight, and Unilateral from "single-arm"/"single-leg"; a field set by hand stops following the name.
- Name collision (case-insensitive): an existing name shows `“<name>” already exists.` with "Use it", or `“<name>” already exists but is hidden.` with "Unhide". From the Exercises tab, "Use it" just closes the sheet; from the picker it adds that Exercise.
- The same sheet is reachable from the exercise picker's `Create “<name>”` row (Routine editor and Ledger), prefilled with the search text. Saving adds the new Exercise to the Routine or Workout.
- Filters (#118): a filter button opens a native menu; its icon (`line.3.horizontal.decrease.circle`) is filled while any filter is on. Facets are single-select and combine with AND.
  - Exercises tab: a toolbar `Button` "Filter" left of "+", with an "Equipment type" submenu (Any checked by default, then each type), "Done at <Current Gym>" (absent before the first Workout) and "Custom". Sections stay; empty ones drop. Filters last while the app runs, not across `cv launch`.
  - Picker: a `PopUpButton` "Filter" at the end of the search row, adding a "Muscle group" submenu. Done reads "Done at <Workout's Gym>" in the Ledger and "Done before" (any Gym, absent with no history) in the Routine editor. Every opening starts with no filters. The `Create “<name>”` / `Unhide` row ignores filters.
  - Nothing matching shows `No Exercises match these filters.` with a "Clear Filters" `Button`.
  - Done counts any confirmed set, Warm-up included, on any Station at the Gym, Retired ones included.
- Hidden Exercises: the picker offers `Unhide “<name>”` instead of Create. To reach it, long-press an Exercise on the Exercises tab and pick "Hide".
- Menu hint: atop the Exercises tab list, "Touch and hold an Exercise to hide it, or to edit or delete a Custom one." until the first pick from a row menu (there or in Hidden Exercises) sets `settings.exercise_menu_used = 1`. Hidden while searching or filtering, and never shown in Hidden Exercises or the picker. Verified on iOS.

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

To prove inference and the collision:

```sh
cv tap "New Exercise" && cv type "Single-arm DB Row"   # Name is focused on open
cv tree | grep -E "PopUpButton|CheckBox"                # Dumbbell, External, Unilateral 1
cv tap None --element-type PopUpButton && cv tap Lats --element-type Button
cv tap Save --element-type Button
cv tap "New Exercise" && cv type "single-arm db row"
cv wait "“Single-arm DB Row” already exists." 5 && cv shot 3-collision
cv tap --pre-delay 0 -x 55 -y <"Use it" row centre>     # "Use it", by frame (see Gotchas)
```

To prove filters (needs a Workout with one confirmed Bench Press set at a Gym named "Garage"; see [workout-ledger.md](workout-ledger.md)):

```sh
cv tap Exercises --element-type RadioButton
cv tap Filter --element-type Button && cv tap "Equipment type" && cv tap Machine --element-type Button
cv shot 1-machine-only                              # only Machine rows, filled icon
cv tap Filter --element-type Button && cv tap Custom
cv wait "No Exercises match these filters." 5 && cv tap "Clear Filters" --element-type Button
cv tap Filter --element-type Button && cv tap "Done at Garage"
cv shot 2-done                                      # only Barbell Bench Press
# In the Ledger: Add Exercise, then the picker's filter
cv tap Filter --element-type PopUpButton && cv tap "Done at Garage"
cv type "Leg"                                       # Create “Leg” row stays above the empty message
```

## Gotchas

- Equipment type may be inferred from the typed name (`lib/exercise/infer.ts`), so the PopUpButton's label can change after typing. Read it from `cv tree` before tapping.
- Load type and Muscle group are PopUpButtons too, labelled with their current value ("External", "None").
- Built-in rows are `StaticText` in the library but `Button` with label `<name>, <muscle group>` in the picker sheet. Exercises without a Muscle group are labelled `<name>`, and marked ones gain `, In Routine` or `, In Workout`.
- Unilateral is a `CheckBox` (value 1 when on), not a PopUpButton.
- "Use it" and "Unhide" are text buttons that only respond on their text; `cv tap "Use it"` hits the middle of the row and does nothing. Tap the text's left edge by frame.
- The filter is a `Button` in the tab's toolbar but a `PopUpButton` in the picker; pass `--element-type`.
- The first confirmed Working set can raise the iOS notification prompt over the Ledger; tap "Don't Allow" by frame before driving on.
- The Exercises tab's search field and the sheet's Name field are both TextFields; always pass `--value`.
