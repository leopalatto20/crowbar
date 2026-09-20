# One Routine That Learns Every Gym

## Problem Statement

How might we let advanced solo lifters use one evolving routine across multiple gyms while preserving equipment-specific performance history, without adding setup or maintenance during training?

## Recommended Direction

Build **Progressive Gym Adapters**: one canonical routine whose movements acquire gym-specific execution contexts as the trainee logs workouts. The trainee chooses a gym and starts training immediately. Crowbar reuses known equipment mappings; when a context is unknown or changes, it asks one brief question and learns from the answer.

The product should not expose its underlying model as configuration work. Gym profiles are the result of training, not a prerequisite for it. This turns Crowbar's differentiator from "better workout metadata" into a concrete promise: **one routine that learns every gym as you train.**

The first version succeeds when a lifter uses the same routine at two gyms for several weeks, sees the correct equipment-specific history at each, and never creates or synchronizes duplicate routines.

## Key Assumptions to Validate

- [ ] **Capturing an unknown equipment context can take less than 10 seconds without disrupting training.** Test clickable workout prototypes with 5-8 multi-gym lifters between simulated sets.
- [ ] **Equipment-specific history changes real training decisions.** Ask testers to choose their next load and reps first with generic movement history, then with exact-equipment history; record whether decisions change and confidence improves.
- [ ] **A learned gym mapping remains useful on later visits.** Run a 3-4 week concierge pilot across at least two gyms and measure how often users accept, replace, or correct the suggested equipment.
- [ ] **One routine can absorb normal substitutions without becoming ambiguous.** Observe how testers handle occupied machines, alternate implements, and multiple machines for the same movement at one gym.
- [ ] **Eliminating duplicate routine maintenance is enough to drive repeated use.** Success is repeated cross-gym logging, not stated enthusiasm: at least 60% of pilot users should complete workouts at two gyms in three consecutive weeks.

## MVP Scope

- One editable routine shared across every gym.
- Gym selection at workout start.
- Progressive creation of an equipment context when a movement is first performed at a gym.
- Automatic reuse of the last accepted context, with a fast "different equipment" escape hatch.
- Equipment contexts with a user-recognizable name and load representation: kilograms, pounds, or plate count.
- Set logging for load, repetitions, and the trainee's global RPE or RIR preference.
- Immutable set history retaining movement, gym, equipment context, and original load representation.
- During logging, show prior sets only from the selected equipment context.
- Local, offline-capable iOS and Android experience.
- English and Spanish product structure and copy, with English fallback.

The core interaction target is zero added decisions for known contexts and one brief decision for unknown contexts.

## Not Doing (and Why)

- **Cross-machine load conversion** - machine numbers are not equivalent, and false precision would damage trust.
- **Automatic progression recommendations** - useful only after contextual history is proven valuable.
- **Shared machine or gym catalog** - cold-start data and moderation obscure the core personal workflow.
- **Mandatory gym setup wizard** - directly contradicts progressive learning and front-loads effort.
- **Photos, seat positions, handles, and detailed setup notes** - plausible extensions, but not required to validate context-specific history.
- **Coach, social, or collaborative features** - the first user is an individual lifter in an active workout.
- **Cloud accounts and cross-device sync** - not necessary to test the product wedge unless pilot retention reveals device loss or migration as a blocker.
- **Analytics dashboards and long-term trend comparison** - the immediate job is choosing and recording the next set correctly.
- **Web support** - `PRODUCT.md` commits v1 to iOS and Android.

## Open Questions

- What is the minimum information that lets a trainee recognize an equipment context later: custom name, manufacturer/model, photo, or some combination?
- Should gym selection be explicit every workout, remembered from the last visit, or suggested from location?
- How should Crowbar represent two valid machines for the same movement within one gym?
- When equipment is occupied, is a substitution a one-session override or a newly learned default?
- Does "routine" mean one program with multiple workout days, and does the validation build need more than one active program?
- What evidence threshold should promote a learned context into the default for that gym?
