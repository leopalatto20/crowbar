# Crowbar

A workout tracker for advanced lifters that tracks exercise progress separately for each gym the lifter trains at.

## Language

**Gym**:
A physical place where the lifter trains. Progress is always read in the context of a Gym.
_Avoid_: Location, venue, facility

**Routine**:
A gym-agnostic plan of exercises with Targets, defined once and run at any Gym.
_Avoid_: Program, template, plan

**Workout**:
One training session, logged at exactly one Gym. It may start from a Routine, as a snapshot of that Routine's Exercises and Targets that later Routine edits never touch.
_Avoid_: Session, training, log

**Exercise**:
A movement performed on a type of equipment, such as Barbell Bench Press or Machine Chest Press; gym-agnostic, and what a Routine lists.
_Avoid_: Lift, movement, move

**Built-in Exercise**:
An Exercise that ships with Crowbar; it can be hidden but never edited.
_Avoid_: Default exercise, stock exercise

**Custom Exercise**:
An Exercise created by the lifter; it can be renamed, hidden, or deleted along with its history.
_Avoid_: User exercise, personal exercise

**Hidden Exercise**:
An Exercise left out of the picker and search; its history and its place in Routines are untouched.
_Avoid_: Archived, deleted

**Equipment type**:
The class of equipment an Exercise is performed on, such as Barbell, Dumbbell, Machine, or Cable; part of what makes an Exercise what it is.
_Avoid_: Equipment (a Station is the concrete equipment)

**Muscle group**:
The one primary muscle an Exercise trains, used only to browse the exercise library.
_Avoid_: Body part, target muscle

**Load type**:
How an Exercise's logged load is read: External (the weight moved), Bodyweight, or Assisted. Fixed per Exercise; across all three, higher load is better.
_Avoid_: Weight type, exercise kind

**Bodyweight Exercise**:
An Exercise whose logged load is the weight added to the lifter's body, with zero meaning bodyweight only.
_Avoid_: Calisthenics, weighted bodyweight

**Assisted Exercise**:
An Exercise whose logged load is the assistance taken off the lifter's bodyweight, counted as negative load.
_Avoid_: Counterweight, negative weight

**Unilateral Exercise**:
An Exercise trained one side at a time, where a set's reps are counted per side.
_Avoid_: Single-arm, single-leg, one-sided

**Station**:
One Exercise as performed on specific equipment at one Gym; it carries the weight unit and machine notes, and every logged set belongs to one. A Gym can hold several Stations for the same Exercise.
_Avoid_: Machine, setup, equipment, gym exercise

**Retired Station**:
A Station whose equipment is gone from its Gym; its history remains, but nothing new is logged to it until it is returned to service.
_Avoid_: Deleted, archived station

**Target**:
A planned value on a Routine (set count, rep range, RIR or RPE, rest) that guides logging but is never enforced.
_Avoid_: Goal, requirement

**Rest**:
The timed pause that follows a confirmed Working set, lasting the slot's rest Target or the app-wide default. Only one Rest runs at a time, and it is never recorded in history.
_Avoid_: Break, recovery, rest period

**Working set**:
A set performed as real training effort; the only kind of set that counts toward progress.
_Avoid_: Work set, top set (a top set is one particular Working set)

**Warm-up set**:
A preparatory set logged for the record but excluded from progress.
_Avoid_: Ramp-up, feeder set

**Stack level**:
A unitless load value for equipment with no reliable weight label, such as a numbered pin position; comparable only to itself.
_Avoid_: Plate number, pin

**Volume**:
The sum of load × reps over a Workout's Working sets at one Station of an External Exercise; comparable only within that Station.
_Avoid_: Tonnage, workload

**Rep record**:
The most reps done at a given load, or the heaviest load done for a given rep count, on one Station.
_Avoid_: PR, personal best, max

**Backup**:
A file holding a complete copy of the lifter's data; restoring one replaces everything currently in Crowbar.
_Avoid_: Export, snapshot, archive
