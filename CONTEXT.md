# Crowbar

Local-first, single-lifter workout tracking for advanced lifters. The domain splits along two axes: identity (movements, exercises, gyms) and measurement (sets, volume, strength). Progress is keyed to the place and tool the work happened with.

## Identity

**Movement**:
A canonical, gym-agnostic lift (e.g., "Bench Press"). Movements live once in the library and are the text of every routine. Movements are **equipment-free** — "Fly", not "Dumbbell Fly"; variations (implement, grip, angle, stance) live in sub-routine bindings, never as separate movements. Equipment class is recorded on sub-routine bindings and session entries/sets, never on the movement row. Names are unique app-wide, case- and spacing-insensitive, blank rejected, near-duplicates suggested while typing. Editing re-maps: renaming or re-tagging a movement's history follows it (re-tagging a muscle group re-buckets past volume at query time, after a confirm). Changing a movement's unit is a pure display change — loads are stored canonically (ADR 0004), so past sets simply re-render in the new unit; nothing converts and history stays truthful.
_Avoid_: exercise (overloaded), lift

**Catalog**:
The full set of movements — the hand-authored **seed catalog** plus everything the user creates. Seed movements are ordinary movements: no provenance flag, no protection, freely renamed/re-tagged/archived. Product updates never overwrite; updates only ever *add*.
_Avoid_: library, dataset, factory catalog

**Instructions**:
A movement's personal user notes — free multi-line text the lifter writes for themselves, consistent with how they execute the movement. No formatting, no fixed content. Seed movements ship with none; optional per movement. Only the user edits them; they are not part of the shared canonical lift.
_Avoid_: description, cue card, coaching text

**Archived**:
The lifecycle for a movement (or gym) that has history. Archive excludes the movement from *pickers only* — existing routine entries, sub-routine bindings, and history persist untouched, and history still counts in landmarks. **Delete is allowed only when a movement has zero history AND zero references** (sets, routine/sub-routine/session entries); otherwise delete is blocked and the references are shown. Archive is always available, even with zero history — it is the escape hatch; un-archive clears the flag.
_Avoid_: deleted, removed

**Equipment class**:
The tool a movement is performed with — barbell, dumbbell, machine, cable, smith, bodyweight, other.
_Avoid_: equipment type, tool

**Exercise**:
Movement × Equipment Class (e.g., Bench Press on the machine). The minimal unit that carries its own progress history. Exercises are **not stored** — the pair is derived from the movement + class recorded on sets and sub-routine bindings.
_Avoid_: movement, lift — when an equipment-specific unit is meant

**Gym**:
A location context the lifter trains in. Gyms declare nothing — a gym is whatever exercises the lifter actually uses there. **Home** exists by default.
_Avoid_: location, venue

**Routine**:
A gym-agnostic, ordered list of movements, each entry carrying optional targets — working-set count, rep range, RIR/RPE target (on the recording scale), tempo target. Defined once, executed anywhere.
_Avoid_: program, plan, template, workout

**Routine entry**:
One Movement's position in a Routine, with optional targets for working-set count, rep range, proximity, and tempo. A Routine contains at most one entry for each Movement.
_Avoid_: routine exercise, routine item

**Routine builder**:
The place where a lifter defines or changes a Routine's name, ordered entries, and optional targets before saving it.
_Avoid_: routine editor, workout builder

**Sub-routine**:
A routine as adapted to a specific gym — the recorded binding of each movement to the exercise (equipment) the lifter used there. One per Routine × Gym, auto-created from the first completed session there. A deviating session does not change it; the lifter is asked at the end whether to update the sub-routine or keep the original.
_Avoid_: gym variant, adapted routine

**Session**:
One visit to one gym, from starting a sub-routine (or an empty plan) to finishing it. Carries date and start/end times. Entries are logged in order; planned movements may be skipped when unperformed, and unplanned exercises append at the end — additions and skips never alter the sub-routine.
_Avoid_: workout, training

## Measurement

**Set**:
One unit of logged work at an exercise inside a session. Carries load and reps, plus an optional proximity value on the recording scale. Every set is a working set and counts as one toward volume landmarks — no other set kinds exist.
_Avoid_: series (translation), rep — a single repetition, distinct from set

**Recording scale**:
The proximity-to-failure scale the lifter records on — **RIR** or **RPE**, exactly one input scale, chosen app-wide. Per-set values are optional. Every stored proximity value records the scale it was written in, so switching the input scale never corrupts history.
_Avoid_: dual RIR/RPE logging

**Recording unit**:
The load unit a movement is logged in — **kg** or **lb**, assigned per movement and defaulting from the app-wide setting. Loads are entered and displayed in the movement's unit with no manual conversion, whatever the other movements use.
_Avoid_: as-entered unit

**Muscle group**:
One of a closed canonical set of 14: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Core, Obliques, Traps, Quads, **Adductors**, Hamstrings, Glutes, Calves. Adductors sits between Quads and Hamstrings so adductor work counts toward its own volume landmark instead of inflating Quads. Every movement carries exactly one primary muscle group; landmarks are keyed by it.

**Volume landmark**:
A weekly target of counted sets for a muscle group (e.g., 12–16 for Chest), measured over the calendar week (Mon–Sun). Global — a muscle group does not know which gym the work happened in. Only **direct** sets count: a set contributes to its movement's primary muscle group, never to secondary work. Default: a uniform 4–8 sets per group, editable.
_Avoid_: weekly volume, volume target (when the muscle-group landmark is meant)

**Strength marker**:
Progressive-overload signal per Exercise × Gym: progress means moving more weight or more reps on working sets at that exercise in that gym. e1RM is a derived convenience, not the tracked quantity. Never shared between islands.
_Avoid_: personal record, PR — unless explicitly scoped to an Exercise × Gym