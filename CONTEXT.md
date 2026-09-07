# Crowbar

Local-first, single-lifter workout tracking for advanced lifters. The domain splits along two axes: identity (movements, exercises, gyms) and measurement (sets, volume, strength). Progress is keyed to the place and tool the work happened with.

## Identity

**Movement**:
A canonical, gym-agnostic lift (e.g., "Bench Press"). Movements live once in the library and are the text of every routine.
_Avoid_: exercise (overloaded), lift

**Equipment class**:
The tool a movement is performed with — barbell, dumbbell, machine, cable, smith, bodyweight, other.
_Avoid_: equipment type, tool

**Exercise**:
Movement × Equipment Class (e.g., Bench Press on the machine). The minimal unit that carries its own progress history.
_Avoid_: movement, lift — when an equipment-specific unit is meant

**Gym**:
A location context the lifter trains in. Gyms declare nothing — a gym is whatever exercises the lifter actually uses there. **Home** exists by default.
_Avoid_: location, venue

**Routine**:
A gym-agnostic, ordered list of movements, each entry carrying optional targets — working-set count, rep range, RIR/RPE target (on the recording scale), tempo target. Defined once, executed anywhere.
_Avoid_: program, plan, template, workout

**Sub-routine**:
A routine as adapted to a specific gym — the recorded binding of each movement to the exercise (equipment) the lifter used there. One per Routine × Gym, auto-created from the first completed session there. A deviating session does not change it; the lifter is asked at the end whether to update the sub-routine or keep the original.
_Avoid_: gym variant, adapted routine

**Session**:
One visit to one gym, from starting a sub-routine (or an empty plan) to finishing it. Carries date and start/end times. Entries are logged in order; planned movements may be skipped when unperformed.
_Avoid_: workout, training

## Measurement

**Set**:
One unit of logged work at an exercise inside a session. Carries load and reps, plus an optional proximity value on the recording scale. Every set is a working set and counts as one toward volume landmarks — no other set kinds exist.
_Avoid_: series (translation), rep — a single repetition, distinct from set

**Recording scale**:
The proximity-to-failure scale the lifter records on — **RIR** or **RPE**, exactly one input scale, chosen app-wide. Per-set values are optional.
_Avoid_: dual RIR/RPE logging

**Volume landmark**:
A weekly target of counted sets for a muscle group (e.g., 12–16 for Chest), measured over the calendar week (Mon–Sun). Global — a muscle group does not know which gym the work happened in.
_Avoid_: weekly volume, volume target (when the muscle-group landmark is meant)

**Strength marker**:
Load-progression signal computed per Exercise × Gym — e1RM curve, load history, proximity patterning. Never shared between gyms, never shared between equipment classes.
_Avoid_: personal record, PR — unless explicitly scoped to an Exercise × Gym