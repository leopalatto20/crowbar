# History

The History tab lists finished Workouts by month, newest first. Its "+" backfills a Workout the lifter forgot to log.

## Sub-features

- Log a past Workout (#46): the toolbar `Button` "Log a past Workout" opens a menu: "Empty Workout", then a "From a Routine" section with one row per Routine (an unnamed one reads "New Routine"; the section is hidden with no Routines). A pick opens the full-screen Ledger in edit mode at the last-used Gym (the "New Gym" prompt first if none exists), starting an hour ago with "Duration 1 h". The `workout` row is created finished, in the device's time zone.
- Its header: the Gym chip ("Gym: <Gym>. Tap to change"), then the "Date and Time Picker" (`Button`s "<d> <Mon> <yyyy>" and "<h:mm> a.m.") and the "Duration 1 h" `PopUpButton`. A future day is refused: the start stays as it was.
- Prefill: "Last here" and the ghost values come from the last Workout at each Station that started before the chosen start. Moving the date earlier than every Workout clears them.
- From a Routine: the snapshot's Exercises, Targets and set rows, as for a live start. Nothing is written back to the Routine.
- Done: keeps only confirmed sets. A backfill with nothing confirmed leaves no `workout` row. No Rest and no haptics.
- Delete a logged set (#115): in edit mode a done set's check becomes `Button` "Delete set" (a minus). The first tap arms it: it grows left into a red "Delete" (`Button` "Confirm delete set") and nothing is deleted. A second tap deletes the `set` row; an emptied Exercise, then a Station with nothing left, go with it. Tapping elsewhere, scrolling, or arming another set disarms it. To tap the armed button, aim at its frame (`cv tap --pre-delay 0 -x 340 -y <row>`).
- Cancel: discards at once with nothing confirmed, else asks "Discard this Workout?" (Discard Workout / Keep logging).

## How to get to it (user POV)

History tab, then the "+" at top right.

## Driving it with crowbar-verify

```sh
cv up --fresh && cv run history
cv tap History --element-type RadioButton
cv tap "Log a past Workout" --element-type Button && cv tap "Empty Workout" --element-type Button
cv type "Downtown Iron" && cv tap Add --element-type Button          # first Gym only
cv tap "add, Add Exercise" --element-type Button && cv tap "Barbell Bench Press, Chest" --element-type Button
cv tap --pre-delay 0 -x 178 -y 327 && cv type 100 && cv tap --pre-delay 0 -x 240 -y 327 && cv type 5
cv tap "Complete set" --element-type Button && cv tap Done --element-type Button
# A second backfill a minute later prefills 100 × 5. To move it earlier:
cv tap "15 Oct 2026" --element-type Button && cv tap "Saturday, 10 October" --element-type Button
cv tap --pre-delay 0 -x 200 -y 820                                   # closes the calendar
cv save-db "select started_at, finished_at, time_zone from workout order by started_at desc"
```

Proof: History rows in start order, `finished_at` set on every backfill, "Last here" present or absent per the chosen start, and `count(*) from workout` unchanged after Done on an empty backfill or after Cancel.
