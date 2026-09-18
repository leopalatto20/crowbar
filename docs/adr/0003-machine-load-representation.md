---
status: accepted
---

# BR-003: Each machine has a load representation

Each machine records load in kilograms, pounds, or plate count, and that representation is part of the meaning of every set recorded on it. Crowbar rejects storing every machine load as a numeric value in one universal unit because `225 lb` and `6 plates` describe different kinds of values.
