# Crowbar

Crowbar's domain vocabulary for planning workouts and recording training performance across gyms.

## Language

**Trainee**:
A person who uses Crowbar to plan, perform, and review strength training.
_Avoid_: User, athlete

**Routine**:
A reusable training plan containing movement prescriptions. A routine is independent of any particular gym or machine.
_Avoid_: Workout, program, template

**Workout**:
One occasion on which a trainee performs movements from a routine and records the resulting sets.
_Avoid_: Session, routine

**Movement**:
The abstract exercise concept prescribed by a routine, independent of the machine used to perform it.
_Avoid_: Exercise, machine, equipment

**Movement prescription**:
The planned instruction for performing a movement within a routine, such as a target number of sets, repetitions, or effort.
_Avoid_: Movement, performance

**Set**:
One performed bout of a movement within a workout. A set is the atomic training record and captures repetitions, load, and optional effort.
_Avoid_: Performance record, result

**Gym**:
A training location containing machines on which a trainee performs movements.
_Avoid_: Location, facility

**Machine**:
A specific piece of training equipment at a gym on which a movement is performed.
_Avoid_: Equipment, station

**Load representation**:
The way a machine's load is recorded: kilograms, pounds, or plate count.
_Avoid_: Unit, weight format

**Plate count**:
The number of plates selected on a machine whose load scale does not provide a numbered weight.
_Avoid_: Weight, load

**Effort metric**:
The scale used to record how close a set was to failure: RPE or RIR.
_Avoid_: Intensity, effort unit

**RPE**:
Rating of perceived exertion, used to describe how difficult a set felt.
_Avoid_: Effort, intensity

**RIR**:
Repetitions in reserve, used to describe how many additional repetitions a trainee believed were possible at the end of a set.
_Avoid_: Effort, reps left
