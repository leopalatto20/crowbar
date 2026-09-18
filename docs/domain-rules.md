# Domain Rules

This document indexes Crowbar's user-facing business rules. `PRODUCT.md` explains the product promise; accepted rules are recorded as individual ADRs, while unresolved decisions remain here until they are accepted.

Accepted rules are part of the current product model. Open decisions must be resolved before the affected behavior or data model is finalized.

## Accepted Rules

- [BR-001: One routine can be used at many gyms](adr/0001-one-routine-many-gyms.md)
- [BR-002: Sets retain gym and machine context](adr/0002-sets-retain-training-context.md)
- [BR-003: Each machine has a load representation](adr/0003-machine-load-representation.md)
- [BR-004: Plate count does not imply weight](adr/0004-plate-count-does-not-imply-weight.md)
- [BR-005: Different load representations are not directly comparable by default](adr/0005-load-representations-not-comparable.md)
- [BR-006: The trainee chooses one effort metric](adr/0006-one-effort-metric.md)
- [BR-007: Routine maintenance is centralized](adr/0007-centralized-routine-maintenance.md)

## Open Decisions

These are not settled rules. Resolve them before building behavior that would make the choice expensive to change.

### OPEN-001: What does a routine change do to an in-progress workout?

If a trainee starts a workout and then changes its routine, does the in-progress workout keep the earlier movement prescriptions, adopt the new ones, or require an explicit refresh?

**Scenario**: The trainee starts Monday's workout, changes the routine's set target, then returns to the unfinished workout.

### OPEN-002: What is preserved when a trainee changes effort metric?

When a trainee switches from RPE to RIR, do previous sets retain their original metric, get displayed through a conversion, or become mixed history with an explicit metric label?

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
