---
status: accepted
---

# ADR-0013: Separate live plans from workout history

Crowbar persists the mutable routine plan and immutable workout history as separate normalized relational graphs. Starting a workout atomically copies its ordered movement prescriptions, set targets, display values, and selected effort metric into workout-owned snapshot rows; performed sets then reference those snapshots and immutable machine histories. This accepts deliberate snapshot duplication to prevent routine, preference, gym, or machine changes from altering historical meaning while avoiding duplicated context on each performed set.

The approved relational contract is documented in [Database Schema](../database-schema.md).
