# Gyms

Every Workout is logged at one Gym, and progress splits by Gym. A new Workout starts at the last-used Gym. The Ledger's Gym chip switches the Workout in progress to another Gym or a new one. Settings lists the Gyms for renaming and deleting.

## Sub-features

- Default: "Start empty Workout" (or a Routine) starts at the Gym of the latest Workout. Before any Workout, it uses the newest Gym.
- Gym chip: the Ledger's first row, a `Button` labelled "Gym: <Gym>. Tap to change". It opens the Gym picker sheet: title "Gym", one row per Gym in name order (the current one labelled "<Gym>, Current Gym", with a checkmark), then "add, New Gym…".
- Switching: picking a Gym moves every Exercise to its default Station at the new Gym, so "Last here" follows the new Gym. Sets already logged move with the Workout, and a Station left empty at the old Gym is deleted.
- New Gym…: the alert "New Gym" (placeholder "Gym name", Cancel/Add) creates the Gym and switches the Workout to it.
- Settings, "Gyms": pushes the Gyms list (back button "Settings"). Tapping a row opens "Rename Gym", with the field prefilled with the current name (Cancel/Save). Long-press shows Rename/Delete, and a left swipe shows Delete/Rename.
- Delete: the alert `Delete “<Gym>”?` with `Deletes <n> Station(s) and <n> set(s) across <n> Workout(s).` counts only logged sets. "Delete" removes the Gym, its Stations, its Workouts (including one in progress there) and their sets.

## How to get to it (user POV)

Start a Workout, then tap the Gym chip under the title. Or: Settings tab, then "Gyms".

## Driving it with crowbar-verify

```sh
cv up --fresh && cv run gyms
cv tap "Start empty Workout" --element-type Button && cv type "Downtown" && cv tap Start --element-type Button
cv tap "add, Add Exercise" --element-type Button && cv tap "Barbell Bench Press, Chest" --element-type Button
cv tap --pre-delay 0 -x 178 -y 273 && cv type 100 && cv tap --pre-delay 0 -x 240 -y 273 && cv type 5
cv tap "Complete set" --element-type Button
cv tap "Gym: Downtown. Tap to change" --element-type Button && cv shot 1-picker
cv tap "add, New Gym…" --element-type Button && cv wait "New Gym" 5
cv type "Garage" && cv tap Add --element-type Button
cv save-db "select g.name gym from station s join gym g on g.id = s.gym_id"   # Garage only
cv tap Finish --element-type Button && cv tap "End Workout" --element-type Button
cv tap Settings --element-type RadioButton && cv tap Gyms --element-type Button
cv tap Garage && cv wait "Rename Gym" 5      # tree: TextField value "Garage"
cv erase 10 && cv type "Home Gym" && cv tap Save --element-type Button
axe touch -x 120 -y 229 --down --up --delay 1.0 --udid <udid>   # long-press the second row
cv tap Delete --element-type Button && cv wait "Delete “Home Gym”?" 5 && cv shot 2-delete-confirm
cv tap Delete --element-type Button
cv save-db "select (select count(*) from gym) gyms, (select count(*) from station) stations, (select count(*) from workout) workouts, (select count(*) from \"set\") sets"
```

Proof: the chip reads the new Gym after the switch, the Station query shows only the new Gym, the confirm reads "Deletes 1 Station and 1 set across 1 Workout.", and the final counts are `1 | 0 | 0 | 0`.

## Gotchas

- The picker sheet's rows are also in the tree behind the Ledger. Check `shot` to see the sheet is up.
- The Settings and Gyms screens share one tab stack. `unstable_settings.initialRouteName` in `(settings)/_layout.tsx` keeps Settings at the root. Without it, the tab opens on Gyms.
