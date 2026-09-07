# Exercise × Gym is the unit of progress

Crowbar tracks progress per Exercise × Gym — the same movement on different equipment, or the same exercise in a different gym, are separate progress islands with separate strength markers. Gyms never declare their stock; a sub-routine records which exercise the lifter actually used there.

A future reader will see Movement, Exercise, and Gym and wonder why "chest press at Gym 1" is not comparable to "chest press at Gym 2". It is not, deliberately: this is the app's core differentiator (the Multi-Gym Context Problem), letting one routine serve many gyms without duplicating workouts or fragmenting analytics.

**Considered Options**: progress per movement globally (loses the differentiator), per routine×gym (forces routine duplication), per exercise globally (a machine-#2 at Gym 1 collides with machine-#1 at Gym 2).
**Consequences**: strength analytics are strictly local to an island; comparing the same movement across gyms or equipment is possible only as an explicit, separate view — it is never merged into a single curve.