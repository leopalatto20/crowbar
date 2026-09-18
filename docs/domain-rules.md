# Domain Rules

This document is the canonical record of Crowbar's user-facing business rules. `PRODUCT.md` explains the product promise; this document makes the behavioral constraints precise enough to implement and test.

Rules marked **Accepted** are part of the current product model. Rules marked **Open** must be decided before the affected behavior or data model is finalized.

## Accepted Rules

### BR-001: One routine can be used at many gyms

**Status**: Accepted

A trainee maintains one routine and can use it at multiple gyms. The routine does not contain gym-specific or machine-specific performance values.

**Example**: Editing the prescribed repetitions for a movement changes the routine once, not one copy per gym.

**Counterexample**: Creating a separate routine for each gym and requiring the trainee to keep those routines synchronized.

### BR-002: Performance retains gym and machine context

**Status**: Accepted

A performance record is associated with the gym and machine where the movement was performed. A nominally identical movement performed on two machines produces records with different equipment context.

**Example**: A chest press performed at Gym A on Machine A and at Gym B on Machine B remains distinguishable in the trainee's history.

**Counterexample**: Treating every chest press record as interchangeable regardless of the machine used.

### BR-003: Each machine has a load representation

**Status**: Accepted

A machine records load as kilograms, pounds, or plate count. The load representation is part of the meaning of the recorded performance.

**Example**: A machine configured for pounds records `225 lb`; a different machine configured for plate count records `6 plates`.

**Counterexample**: Assuming that every machine's load can be stored as a numeric weight in one universal unit.

### BR-004: Plate count does not imply weight

**Status**: Accepted

For a plate-count machine, Crowbar stores the number of plates and does not infer an equivalent kilogram or pound value.

**Example**: `6 plates` remains `6 plates`, even if another machine has a known relationship between plate position and weight.

**Counterexample**: Converting `6 plates` into an estimated weight without an explicit, product-supported machine calibration.

### BR-005: Different load representations are not directly comparable by default

**Status**: Accepted

Crowbar must not present performance records from different machines or load representations as directly equivalent unless an explicit comparison or conversion policy is introduced.

**Example**: A pounds record and a plate-count record remain separate historical values in reporting.

**Counterexample**: Ranking a plate-count performance against a pounds performance as though the values describe the same quantity.

### BR-006: The trainee chooses one effort metric

**Status**: Accepted

A trainee chooses RPE or RIR as their effort metric. The selected metric is used consistently as the trainee's product-wide effort vocabulary.

**Example**: When RIR is selected, effort entry and effort labels use RIR rather than asking the trainee to choose a metric for every set.

**Counterexample**: Silently mixing RPE and RIR values in one trainee's effort history without identifying which metric each value uses.

### BR-007: Routine maintenance is centralized

**Status**: Accepted

Changes to a routine must not create maintenance work across duplicated gym-specific workouts.

**Example**: Adding a movement to a routine makes it available wherever that routine is used.

**Counterexample**: Requiring the trainee to add the movement separately to every gym's copy of the routine.

## Open Decisions

These are not settled rules. Resolve them before building behavior that would make the choice expensive to change.

### OPEN-001: What does a routine change do to an in-progress workout?

If a trainee starts a workout and then changes its routine, does the in-progress workout keep the earlier movement prescriptions, adopt the new ones, or require an explicit refresh?

**Scenario**: The trainee starts Monday's workout, changes the routine's set target, then returns to the unfinished workout.

### OPEN-002: What is preserved when a trainee changes effort metric?

When a trainee switches from RPE to RIR, do previous performance records retain their original metric, get displayed through a conversion, or become mixed history with an explicit metric label?

**Scenario**: A trainee has six months of RPE history and switches to RIR before the next workout.

### OPEN-003: Can a machine's load representation change?

If a machine changes from pounds to kilograms, or from a numbered scale to plate count, does that create a new machine identity, a new configuration period, or a mutation of the existing machine?

**Scenario**: A gym replaces a machine but keeps it in the same physical location.

### OPEN-004: What identifies a machine over time?

Is a machine the physical apparatus, the gym's named equipment entry, or the combination of a gym and an equipment configuration?

**Scenario**: Two identical leg-press machines exist at one gym, or one machine is replaced by an identical model.

### OPEN-005: Which routine details are copied into a workout?

When a workout begins, which movement-prescription details become fixed historical facts and which remain linked to the routine?

**Scenario**: A routine's target repetitions change after a completed workout has been recorded.

## Enforcement

Each accepted rule should have at least one domain or end-to-end test that proves its observable behavior. Tests should refer to the rule ID so a future change can identify which product guarantee is being updated.
