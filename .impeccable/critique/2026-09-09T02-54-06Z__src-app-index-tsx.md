---
target: src/app/index.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/leote/code/projects/crowbar/src/app/index.tsx"
target_fingerprint: "sha256:c0298e1e605dc96828658d6092efe4ba0aff12fa757009ec74bb12ee0d554435"
target_path: /Users/leote/code/projects/crowbar/src/app/index.tsx
timestamp: 2026-09-09T02-54-06Z
slug: src-app-index-tsx
---
Method: dual-agent (A: design-review · B: detector)

# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Loading, retry, and errors exist; saves and archive actions close silently. |
| 2 | Match System / Real World | 3/4 | Strong training vocabulary, but “canonical” and “Sub-routines” need context. |
| 3 | User Control and Freedom | 2/4 | Cancel and filter clearing work; archive undo and dirty-form protection are missing. |
| 4 | Consistency and Standards | 3/4 | The system is coherent, but selection controls diverge from the documented chip pattern. |
| 5 | Error Prevention | 3/4 | Duplicate checks, required fields, confirmations, and reference-aware deletion are strong. |
| 6 | Recognition Rather Than Recall | 2/4 | Search/filter labels help, but row actions are hidden and selection state is visual-only. |
| 7 | Flexibility and Efficiency | 2/4 | Search and filters help; there are no shortcuts, bulk actions, favorites, or recents. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Calm ledger composition, though the header becomes control-heavy. |
| 9 | Error Recovery | 2/4 | Retry and inline errors help; blocked deletion ends without a next action. |
| 10 | Help and Documentation | 1/4 | No contextual help; only a technical unit-change explanation. |
| **Total** | | **24/40** | **Acceptable** — strong visual foundation, but significant interaction improvements remain. |

## Design Specificity Verdict

**LLM assessment: visually specific, behaviorally generic.** The centered 800px ledger column, monochrome tonal surfaces, system typography, 16px gutters, and 12px rows strongly honor Crowbar’s “Strength Ledger” direction. Domain concepts such as Catalog, movement, muscle group, archive, and canonical history are appropriate. However, the interaction model still resembles a generic CRUD admin: literal “+”, “More”, hidden row actions, and a form modal. The target `src/app/index.tsx` is only a route re-export; the meaningful surface is `src/features/catalog/catalog-screen.tsx`.

**Deterministic scan:** `impeccable detect --json src/app/index.tsx` exited 0 with **0 findings**. No rule names, messages, or locations were reported. This confirms no detectable anti-patterns in the scanned entry file, but it does not assess the re-exported catalog implementation.

**Browser evidence:** skipped because no browser automation or mutable dev-page capability was available. No user-visible overlays are available.

## Overall Impression

The screen feels calm, authoritative, and appropriately un-gamified. Its biggest opportunity is to turn a polished catalog into a confident training instrument: make choices easier, make mutations close the loop, and clarify how Catalog supports the rest of the training model.

## What’s Working

- **Material discipline:** tonal cards, restrained monochrome palette, system type, and spacing fit the Strength Ledger (`src/features/catalog/catalog-screen.tsx:218-243`).
- **Domain integrity:** movement identity stays separate from measurement, equipment, and gym context.
- **Strong guardrails:** duplicate detection, history-preserving archive behavior, and reference-aware deletion are thoughtful (`src/features/catalog/movement-row.tsx:54-69`, `src/features/catalog/references-modal.tsx:20-36`).

## Priority Issues

### [P1] Catalog feels like setup, not a Strength Ledger instrument

**Why it matters:** With Catalog as the only visible navigation destination, users cannot tell how this screen connects to recording routines or progress.

**Fix:** Add a concise role line such as “Canonical movements used across routines and gyms.” Provide a clear route to recording/routines when those surfaces exist, while keeping landmarks out of this identity list.

**Suggested command:** `/impeccable clarify`

### [P1] Filter and editor choice overload

**Why it matters:** The filter can expose up to 15 choices and the editor exposes 14 muscle-group buttons, exceeding the ≤4-choice working-memory guideline and slowing repeated catalog work.

**Fix:** Replace the wrapped choice wall with a searchable single-select picker or bottom sheet showing the current selection plus recent/common groups.

**Suggested command:** `/impeccable distill`

### [P1] Mutation flows do not close the loop

**Why it matters:** Save/archive refresh and close without explicit confirmation; archive has no undo; closing an edited modal can discard work; blocked deletion gives no useful next step.

**Fix:** Add a success status/toast, immediate Undo for archive, dirty-close confirmation, and a reference sheet with an Archive CTA or navigable owners.

**Suggested command:** `/impeccable harden`

### [P2] Accessibility and affordance semantics are incomplete

**Why it matters:** Filter, muscle-group, and unit selections appear selected visually but do not clearly expose selected/radio state. Field labels, modal focus management, and a text-labelled Add action need stronger semantics.

**Fix:** Add selected/radio semantics, explicit field labels, modal focus management, and a visible “Add movement” label where space permits (`src/features/catalog/catalog-screen.tsx:249-291`, `src/features/catalog/movement-editor-modal.tsx:239-303`).

**Suggested command:** `/impeccable audit`

### [P2] Empty and near-match states are passive

**Why it matters:** “No movements match” and “Did you mean…” do not provide an immediate path forward, especially for first-time users.

**Fix:** Distinguish filtered-empty from truly empty catalog; offer Clear filters and Create movement actions; make near matches actionable (`src/features/catalog/catalog-screen.tsx:355-367`).

**Suggested command:** `/impeccable onboard`

## Cognitive Load

**Moderate load — 3 failed checklist items:**

- **Single focus:** browsing, searching, filtering, archive management, and CRUD compete in the header (`catalog-screen.tsx:218-322`).
- **Chunking:** filters can show up to 15 choices; the editor shows 14 muscle-group buttons.
- **Minimal choices:** those 14–15 visible options exceed the ≤4-choice guideline.

Grouping, hierarchy, progressive disclosure of row actions, and keeping context visible are otherwise reasonably strong.

## Emotional Journey

Entry feels calm and authoritative. Scanning builds confidence through names, muscle groups, and result counts. Tension appears when users decode “More” or navigate a wall of options. The high-stakes archive/delete moments have good prevention but weak reassurance: archive is immediately irreversible in the visible UI, and blocked deletion provides no next action. The end state is flat because saving closes silently and “No movements match” teaches nothing.

## Persona Red Flags

### Alex — Impatient Power User

- Must open each row’s “More” menu; there are no bulk maintenance actions, shortcuts, favorites, or fast-add path.
- The 14-choice editor is slow for repeated catalog work.
- Search reloads on every keystroke; debounce would reduce churn.

### Sam — Accessibility-Dependent User

- Selection state for filters, muscle groups, and units is visually implied rather than explicitly semantic.
- Major editor fields need explicit labels and the modal needs reliable focus management.
- Archived opacity may weaken distinction for low-vision users if it is the only cue.

### Casey — Distracted Mobile User

- Important Add/filter controls sit at the top, outside the thumb-friendly lower area.
- The editor is a long scrolling sheet and local draft state may be lost on interruption.
- `ReferencesModal` lacks the editor’s SafeAreaView treatment (`movement-editor-modal.tsx:229-236`, `references-modal.tsx:10-18`).

## Minor Observations

- `pb-28` correctly reserves space for bottom navigation (`catalog-screen.tsx:218`).
- Search should be debounced.
- Locale-formatted reference dates may be inconsistent with a ledger-like presentation.

## Questions to Consider

- Is Catalog truly the home screen, or is it setup that should yield to “Start session”?
- How can this surface express Exercise × Gym continuity without violating the identity/measurement boundary?
- Should archive feel like a reversible hide operation? If so, why is there no immediate Undo?
