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
- [BR-008: A started workout keeps its routine snapshot](adr/0008-started-workout-keeps-snapshot.md)
- [BR-009: Sets retain their recorded effort metric](adr/0009-sets-retain-effort-metric.md)
- [BR-010: A load representation change starts a new machine](adr/0010-load-representation-change-starts-new-machine.md)
- [BR-011: Machine history is trainee-managed](adr/0011-machine-history-is-trainee-managed.md)
- [BR-012: A workout snapshots complete movement prescriptions](adr/0012-workout-snapshots-complete-prescriptions.md)

## Open Decisions

None.

## Enforcement

Each accepted rule should have at least one domain or end-to-end test that proves its observable behavior. Tests should refer to the rule ID so a future change can identify which product guarantee is being updated.
