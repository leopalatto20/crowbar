# Settings

App-wide logging preferences stored in the single `settings` row: Effort scale (RIR or RPE) and Default weight unit (kg, lb, Stack level).

## Sub-features

Both rows sit in a "Logging" section.

A "Training" section holds the "Gyms" row, which pushes the Gyms list; see [gyms.md](gyms.md).

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

## Gotchas

- PopUpButtons are labelled with their current value, so the selector changes after each pick ("RIR" becomes "RPE").
- The weight unit default depends on the simulator's region (US gives lb); take a baseline query instead of assuming kg.
- Effort scale shows up elsewhere: the Routine editor's `Effort (RIR)` panel title and the Ledger's effort column follow it.
- To see the unit change in the Ledger, use an Exercise with no Station at the current Gym yet. Ones logged there before keep their old unit, which looks like the setting failed.
