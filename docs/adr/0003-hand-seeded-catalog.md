# Hand-seeded movement catalog, dataset rejected

The initial movement catalog is hand-seeded by us with basic movements, extended by the user over time. An existing MIT-licensed dataset (hasaneyldrm/exercises-dataset, 1,324 exercises) was considered and rejected.

Auditing showed the dataset's muscle mappings are unreliable at the grain we need ("cable bench press" tagged primary triceps), its equipment vocabulary is a 28-value noisy long tail ("band" vs "resistance band", "olympic barbell" vs "barbell"), and its media is licensed separately with attribution requirements we don't want to ship. Curating it would cost as much as seeding ~50 clean movements ourselves, and a clean seed is easier for users to extend.

**Considered Options**: ship the MIT dataset with a curation/re-mapping layer (rejected: curation cost ≈ seed cost, and the corruption lives on); ship no catalog at all (rejected: volume landmarks and empty-landing-page onboarding are worse).
**Consequences**: the seed is small, opinionated, and trustworthy; users create movements not in the seed. Catalog growth is user-driven, not dataset-driven.