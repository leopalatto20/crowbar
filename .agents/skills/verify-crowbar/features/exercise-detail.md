# Exercise detail

One Exercise's progress at one Station: the Station switcher, the progress chart, Rep records, and set history, newest Workout first. Everything is read from the logged sets, so the database never changes here; the proof is the screen matching the sets in SQLite.

## Sub-features

- Station switcher: the Gym (and label) of the shown Station, opening a list of every Station of the Exercise at every Gym; "Loads in <unit>" under it.
- Change Unit (#117): "More", "Change Unit", then a unit (checkmark on the current one). With logged sets it asks "Change this Station to <unit>?" ("Logged numbers stay as they are, so <n> sets will read in <unit>.", "Cancel" / "Change"); Cancel keeps `station.unit`. With no logged sets (a Station made by machine notes alone) it applies at once, and re-picking the current unit does nothing. "Loads in <unit>" follows.
- Progress chart (#48): one point per Workout at the Station, oldest on the left, the Working-set count under each point.
  - Title and value by Load type and unit: External in kg/lb "Volume (kg)" with `1,515 kg`; Stack level "Level × reps" with a bare number and no y-axis labels; Bodyweight and Assisted "Working-set reps" with `23 reps` (`23 reps/side` when Unilateral).
  - Readout above the plot: the latest point's value, then `<date> · <n> sets`. Press and hold on the plot to scrub: the readout follows the nearest point, with a vertical line and a dot on it.
  - Two slots on the same Station in one Workout sum into one point.
  - The chart's container is one accessibility element labelled `Latest: <value>, <date> · <n> sets`.
- Rep records: collapsed card, "Most reps by load" and "Heaviest load by reps".
- Set history: one card per Workout, Working sets numbered as the Ledger numbers them, a green arrow ("Beat last time") on sets ahead of the same-numbered set last time.

## How to get to it (user POV)

Exercises tab, then an Exercise's row. Also from the Ledger's Exercise menu, as a sheet.

## Driving it with crowbar-verify

Log Workouts through History's "Log a past Workout" first (see [history.md](history.md)): Barbell Bench Press on several days, one of them with the Exercise added twice. For Stack level, set Settings, "Default weight unit" to "Stack level" before the first Machine Chest Press set. The search field's hyphen turns into an apostrophe, so search "pull" for Pull-Up.

```sh
cv tap Exercises --element-type RadioButton
cv tap "Barbell Bench Press"
cv tree | grep Latest                      # GenericElement "Latest: 1,515 kg, Thu 8 Oct · 3 sets"
cv shot 1-chart
axe touch -x 216 -y 380 --down --udid <udid>   # hold on a point (frame from the Latest element)
cv shot 2-scrub                            # readout shows that point
axe touch -x 216 -y 380 --up --udid <udid>
cv save-db "select date(w.started_at/1000,'unixepoch') d, s.load, s.reps from \"set\" s join workout_exercise we on we.id = s.workout_exercise_id join workout w on w.id = we.workout_id where s.done and s.kind = 'working' order by w.started_at"
```

Proof: each point's value matches the sum over that day's Working sets in `db.txt` (load × reps, or reps for Bodyweight and Assisted), and the scrub screenshot shows a different point's value and date than the resting one.

## Gotchas

- The readout and set counts are drawn in Skia, so they're absent from `cv tree`; only the container's summary label is there. Read them from a `shot`.
