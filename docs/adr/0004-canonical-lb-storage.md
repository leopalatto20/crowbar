# Canonical pound storage with per-movement display unit

All loads are stored canonically in pounds. The app-wide setting (default kg) only picks the initial display; each movement remembers the unit it is logged in (kg or lb), and entry/display convert transparently against the canonical value.

Lifting in a mixed-unit world, most lifters log some movements in kg and others in lb (plate math, machine scales) and converting by hand is friction that kills logging. A per-movement unit makes the app conform to the user instead of the reverse.

**Considered Options**: store kg canonically (rejected: the user's stated intent is lb); store as-entered plus unit column (rejected: every progression chart, e1RM, and comparison would need per-row conversion and unit switches would corrupt history); single app-wide unit with no per-movement override (rejected: alternating kg/lb movements becomes manual-conversion pain).
**Consequences**: kg-based charts are an edge conversion, not a storage concern; historical data stays truthful across any unit change, per-movement or global.