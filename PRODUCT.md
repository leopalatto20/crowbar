# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Crowbar is mobile-only in v1 and targets iOS and Android with platform-appropriate behavior.

## Users

Crowbar is approachable for strength trainees at any experience level. Its primary trainee is an advanced solo lifter who trains at multiple gyms and needs to log, review, and interpret detailed workout metrics such as RPE or RIR while training.

## Product Purpose

Crowbar lets a trainee maintain one workout routine while tracking how each movement is performed on specific machines at each gym. It supports advanced effort tracking through a trainee-wide preference for RPE or RIR. Success means the trainee can change the routine once, use it across gyms, and retain recorded sets that remain meaningful for the equipment available at each location.

## Positioning

Crowbar separates a shared routine from gym-specific movement performance. Other workout trackers often force a multi-gym trainee to duplicate the same routine for each gym, then keep those copies synchronized manually. Crowbar keeps the routine unified while preserving differences between sets, such as performing 350 lb for 5 reps on one gym's machine and 225 lb for 8 reps on another.

## Operating Context

The trainee trains at multiple gyms and follows the same routine across them. Machines and equipment differ between and within locations, so loads and repetitions for a nominally similar movement are not necessarily interchangeable. Each machine records loads in kilograms, pounds, or plate count. Plate-count machines store the number of plates without inferring an equivalent weight. Routine edits must not create maintenance work across duplicate gym-specific workouts.

## Capabilities and Constraints

- Maintain one routine for use at multiple gyms.
- Track movement performance in the context of a specific gym and machine.
- Configure each machine to record loads in kilograms, pounds, or plate count.
- Store only the number of plates for machines without a numbered load scale.
- Preserve machine-specific set histories without assuming that different load representations are directly comparable.
- Let each trainee choose RPE or RIR as their global effort metric.
- Support English and Spanish from v1, with English as the fallback language.
- Ship v1 only on iOS and Android.

## Brand Commitments

The committed product name is Crowbar.

## Product Principles

- One routine, many gyms: routine maintenance must remain centralized.
- Preserve training context: recorded sets must retain the gym, machine, and load representation that make them meaningful.
- Serve advanced lifters without excluding others: detailed metrics must be first-class while core workout logging remains approachable.
- Optimize for the active trainee: workout logging serves an individual in the middle of training.
- Make localization foundational: product structure and copy must support multiple languages from the start.
