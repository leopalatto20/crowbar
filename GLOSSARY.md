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
One training session, logged at exactly one Gym.
_Avoid_: Session, training, log

**Target**:
A planned value on a Routine (set count, rep range, RIR or RPE) that guides logging but is never enforced.
_Avoid_: Goal, requirement

**Working set**:
A set performed as real training effort; the only kind of set that counts toward progress.
_Avoid_: Work set, top set (a top set is one particular Working set)

**Warm-up set**:
A preparatory set logged for the record but excluded from progress.
_Avoid_: Ramp-up, feeder set

**Stack level**:
A unitless load value for equipment with no reliable weight label, such as a numbered pin position; comparable only to itself.
_Avoid_: Plate number, pin
