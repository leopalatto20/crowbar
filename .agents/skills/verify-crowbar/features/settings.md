# Settings

App-wide logging preferences stored in the single `settings` row: Effort scale (RIR or RPE) and Default weight unit (kg, lb, Stack level).

## Sub-features

- Effort scale: RIR / RPE. Changes how effort Targets and Ledger effort read.
- Default weight unit: kg / lb / Stack level. Seeded from the device region on first launch.

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

## Gotchas

- PopUpButtons are labelled with their current value, so the selector changes after each pick ("RIR" becomes "RPE").
- The weight unit default depends on the simulator's region (US gives lb); take a baseline query instead of assuming kg.
- Effort scale shows up elsewhere: the Routine editor's `Effort (RIR)` panel title follows it.
