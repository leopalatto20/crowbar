# Settings

App-wide preferences stored in the single `settings` row: Effort scale (RIR or RPE), Default weight unit (kg, lb, Stack level), the Rest timer and Default rest.

## Sub-features

Both rows sit in a "Logging" section.

A "Rest" section holds "Rest timer" (a `CheckBox` in the tree, value 1 when on, stored as `rest_timer_enabled`) and "Default rest" (a PopUpButton labelled with the current value, `2:00` by default, presets 0:45 to 5:00, stored as `default_rest_seconds`). Off means confirming a Working set shows no Rest card and writes no `rest` row, and turning it off ends a running Rest. Set Default rest to 0:45 to reach "Rest over" quickly.

Below them, "Notifications" (a Button labelled `Notifications, <state>`) appears once the permission is read. "Turn on" (tinted) shows the system prompt, which counts as Crowbar's one ask (`notifications_asked` becomes 1), so a later Rest never prompts. "Off" opens system settings, and "On" does nothing. On iOS the state comes from the OS, so `--fresh` is the way back to "Turn on".

A "Training" section holds the "Gyms" row, which pushes the Gyms list; see [gyms.md](gyms.md).

A "Data" section holds text buttons:

- "Export backup" writes a SQLite copy named `Crowbar backup <yyyy-mm-dd>` and opens the share sheet. Only a finished share (Copy, Save to Files) sets `settings.last_exported_at`, after which a `Last exported <ago>` footer shows. Dismissing the sheet writes nothing.
- "Restore from backup…" opens the file picker; it is refused with "Workout in progress" while a Workout runs, asks "Replace all your data?" (Restore / Cancel), and shows "Can’t restore this file" for a bad file. After a restore, `Undo restore (replaced <date>)` asks "Undo restore?". Not driven live: the picker needs a backup saved to Files first.

- Effort scale: RIR / RPE. Changes the Routine editor's effort pill and panel, the Ledger's effort column header and its Target line.
- Default weight unit: kg / lb / Stack level (stored as `level`, shown as "LVL" in the Ledger). Seeded from the device region on first launch (US gives lb). It applies only to Stations created afterwards: an Exercise already logged at a Gym keeps that Station's unit.

## How to get to it (user POV)

Tap the Settings tab. Each row has a menu button showing the current value.

## Driving it with crowbar-verify

```sh
cv run settings
cv save-db "select effort_scale, default_weight_unit from settings"
cv tap Settings --element-type RadioButton
cv tap RIR --element-type PopUpButton
cv tap RPE --element-type Button
cv shot 1-rpe
cv save-db "select effort_scale, default_weight_unit from settings"
cv launch && cv tap Settings --element-type RadioButton && cv shot 2-after-relaunch
```

Proof: the PopUpButton reads "RPE", `effort_scale` is `RPE` in the second query, and it's still "RPE" after relaunch.

For the weight unit, pick "Stack level" from the unit's PopUpButton the same way, then start an empty Workout and add an Exercise never logged at this Gym: its columns read `LVL` and `RPE`. Discard the Workout afterwards.

For notifications, start from `cv up --fresh`:

```sh
cv tap Settings --element-type RadioButton && cv wait "Turn on" 10
cv tap "Notifications, Turn on" --element-type Button
cv tap Allow --element-type Button   # or "Don’t Allow", with the curly apostrophe
cv save-db "select notifications_asked from settings"
```

Proof: the row reads "Notifications, On" (or "Off") and `notifications_asked` is 1.

## Gotchas

- The Notifications row renders only after an async permission read, so `cv wait "Turn on"` before a `shot`, or the screenshot misses it.
- "Export backup" and "Restore from backup…" are text buttons, so `cv tap "Export backup"` hits the row centre and does nothing (see SKILL.md, Drive). Tap the text by frame: `cv tap --pre-delay 0 -x 56 -y <row centre>`. The share sheet sits outside the accessibility tree; tap "Copy" by frame from a `shot`.
- On a fresh install the first confirmed Working set already asked for notifications (see [workout-ledger.md](workout-ledger.md)), so "Turn on" only shows if no Rest ran yet.
- PopUpButtons are labelled with their current value, so the selector changes after each pick ("RIR" becomes "RPE").
- The weight unit default depends on the simulator's region (US gives lb); take a baseline query instead of assuming kg.
- Effort scale shows up elsewhere: the Routine editor's `Effort (RIR)` panel title and the Ledger's effort column follow it.
- To see the unit change in the Ledger, use an Exercise with no Station at the current Gym yet. Ones logged there before keep their old unit, which looks like the setting failed.
