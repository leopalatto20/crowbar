# Routines

A Routine is a gym-agnostic plan of Exercises with Targets (warm-ups, sets × reps, effort, rest). The Workout tab lists Routines; each opens in the Routine editor.

## Sub-features

- Create: "New Routine" toolbar "+", or "Create your first Routine" when the list is empty. Both open the editor on a new row; backing out of a Routine with no name and no Exercises deletes it.
- Name: the editor's title field; an empty name shows as "New Routine".
- Add Exercise: "add, Add Exercise" opens the picker (search, `Create “<name>”`, `Unhide “<name>”`); Exercises already in the Routine are marked "In Routine" (their row label gains `, In Routine`) but can still be added.
- Targets per Exercise card: a "Rest 2:00" menu (0:45 to 5:00) under the name, then three pills, "No warm-up", "3 × 8–12", "RIR 1–2" (the defaults). Tapping a pill opens its chip panel ("Warm-up sets": None, 1-4; "Working sets × reps": Sets 1-6, rep presets 3–5 to 20–30, "Custom…"; "Effort (RIR)"). A pick moves on to the next pill; the panel's button reads "Close", or "Done" on the last. A new card opens on its Warm-up sets panel. Swipe a card left for "Remove <exercise>".
- Swap and Remove from the name: tapping a card's name (PopUpButton `<exercise>. Opens its menu`) opens "Swap Exercise" and a red "Remove". Swap opens the picker titled "Swap Exercise"; the pick changes only `routine_exercise.exercise_id`, keeping the row's id, position and Targets, and no panel opens.
- Start: tap a row to open its Workout in the Ledger at the last-used Gym (the Gym prompt first if none exists; the "A Workout is in progress" alert if one is running). The Ledger is titled with the Routine name and each Exercise shows a `Target 3 × 5–7 · RIR 1–2 · rest 3:00` line; the Rest after a Working set lasts the slot's rest Target.
- Last run: a row whose Routine has a finished Workout shows `Last: today · <Gym>` (then `yesterday`, `3 days ago`, weeks, months, years).
- List actions: long-press a row for Edit, Share, Duplicate (`<name> copy`), Delete (no swipe actions, ADR 0005); toolbar "Edit"/"Done" toggles drag-to-reorder. Delete removes an empty Routine at once, else asks `Delete “<name>”?` (`Deletes its list of <n> Exercise(s) with their Targets. Past Workouts stay in History.`, Cancel / Delete).
- Share (#142, #143): writes `<name>.crowbar-routine` (JSON: `format`, `version` 2, `name`, and per slot either `exercise.builtIn` (slug) or `exercise.custom` (name, equipmentType, loadType, unilateral, muscleGroup; never the id), plus warmups, sets, repMin/repMax, rirMin/rirMax, restSeconds; nothing else) to the app's `Library/Caches/shared-routines/` and opens the system share sheet ("<name> · Crowbar Routine · <n> bytes", with Crowbar among the apps).
- Import: opening a `.crowbar-routine` in Crowbar presents a sheet with the name, `<n> Exercises`, each Exercise name in the receiver's language, each Custom Exercise from the file followed by "Reused" or "New" and shown under its final name (a new one colliding with an existing name gets " (2)", " (3)", ...), then "Import" and "Cancel". Cancel writes nothing. A Custom Exercise is reused when an Exercise's name matches ignoring case and accents (either language, or that name plus a " (n)" suffix) with the same Load type and Unilateral; otherwise Import creates it. Verified on iOS: round trip into the sharer's own library shows "Reused" and creates nothing; after changing the Custom Exercise's Load type, reopening the file shows "<name> (2) · New", and a second import shows it "Reused". Import adds a new Routine at the end of the order (same name allowed) in one transaction, then opens it in the editor. A Workout in progress stays as it was, its bar still showing. A newer or damaged file shows "Can’t open this Routine" with OK (from source; not driven live).
- Menu hint: the Routines section footer reads "Touch and hold a Routine to edit, share, duplicate or delete it." until the first action picked from that menu sets `settings.routine_menu_used = 1`; hidden in Edit mode and with no Routines. Verified on iOS.

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

To set Targets, before going back to the list (the new card's Warm-up sets panel is already open):

```sh
cv tap 2 --element-type Button            # 2 warm-ups; the panel moves on to sets × reps
cv tap 5–7 --element-type Button          # rep preset; the panel moves on to Effort
cv tap Done --element-type Button
cv tap "Rest 2:00" --element-type PopUpButton && cv tap 3:00 --element-type Button
cv save-db "select warmups, sets, rep_min, rep_max, rest_seconds from routine_exercise"   # 2 | 3 | 5 | 7 | 180
```

To start it:

```sh
cv tap "Push Day"                         # the row; tap starts, long-press opens the menu
cv wait "add, Add Exercise" 10 && cv shot 3-ledger
cv save-db "select w.routine_name, e.name, we.sets, we.rest_seconds, group_concat(s.kind) from workout w join workout_exercise we on we.workout_id = w.id join exercise e on e.id = we.exercise_id join \"set\" s on s.workout_exercise_id = we.id group by we.id"
```

To share and import (#142), with "Push Day" the first row:

```sh
axe touch -x 201 -y 304 --down --up --delay 1.0 --udid <udid>   # the row's menu
cv tap Share --element-type Button && cv shot share-sheet
cp "$(xcrun simctl get_app_container <udid> com.anonymous.crowbar data)"/Library/Caches/shared-routines/*.crowbar-routine "$(cat ~/.cache/crowbar-verify/current-run)/"
cv tap --pre-delay 0 -x 68 -y 651          # "crowbar" in the share sheet's app row
cv wait Import 10 && cv shot preview
cv tap Import --element-type Button        # lands in the editor on the new Routine
cv save-db "select r.name, r.position, re.position as slot, re.exercise_id, re.warmups, re.sets, re.rep_min, re.rep_max, re.rir_min, re.rir_max, re.rest_seconds from routine r join routine_exercise re on re.routine_id = r.id order by r.position, re.position"
```

To reopen a file already written (the share sheet would write a fresh one), deep-link to the sheet with the file URL encoded twice (once as a file URL, once as a query value):

```sh
F="$(xcrun simctl get_app_container <udid> com.anonymous.crowbar data)/Library/Caches/shared-routines/Push Day.crowbar-routine"
xcrun simctl openurl <udid> "crowbar:///import-routine?file=$(python3 -c 'import sys,urllib.parse as u;print(u.quote("file://"+u.quote(sys.argv[1]),safe=""))' "$F")"
cv save-db "select name, load_type, unilateral, hidden from exercise where built_in = 0 order by name"
```

Proof: the copied file holds only the fields above, the preview lists the Exercises in order, and the new Routine's rows repeat the original's Targets at the next position. Cancel instead of Import leaves `count(*) from routine` unchanged.

Proof: the Ledger title is the Routine name, the bench card shows two "W" rows then 1-3, the line `Target 3 × 5–7 · RIR 1–2 · rest 3:00` sits under the name, and a confirmed Working set starts a 3:00 Rest. After Finish → End Workout with at least one set logged, the row reads `Last: today · <Gym>`. Deleting the Routine leaves the `workout` row with `routine_id` null and `routine_name` intact.

## Gotchas

- The Ledger's back button is labelled `(tabs)`.
- After tapping "New Routine", `cv wait "0 exercises · 0 working sets"` before tapping the name field. `cv wait "Routine name"` never succeeds: that's the field's placeholder (its value), not a label. The field doesn't take focus by itself, so tap it before typing.
- The name field saves on every keystroke; fast input loses characters, which is why `cv type` is paced. Check the field's value in `cv tree` after typing.
- After naming, the TextField's value is the name, not "Routine name"; target it with `--value "<current name>"`.
- Long-press menus need a press-and-hold: `axe touch -x 201 -y <row centre> --down --up --delay 1.0 --udid <udid>`, not `tap`. The menu's "Edit" shares its label with the toolbar "Edit", so tap it by frame; "Share", "Duplicate" and "Delete" are unique.
- After a drag, `cv tree` can report every card's name menu at the first card's frame. Open a lower card's menu by tapping its name's on-screen position with `axe tap -x <x> -y <y>`.
- `Workout` is both the tab (RadioButton) and the editor's back button (Button). With a Workout minimized, its bar is a third `Workout` Button, so tap the editor's back button by frame (`cv tap --pre-delay 0 -x 38 -y 84`).
- The share sheet is a remote view: none of it is in `cv tree`. Read it from a `shot` and tap by frame; "crowbar" is the first app (`-x 68 -y 651` on the iPhone 17 Pro sim).
