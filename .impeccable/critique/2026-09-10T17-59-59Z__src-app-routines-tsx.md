---
target: src/app/routines.tsx
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/leote/code/projects/crowbar/src/app/routines.tsx"
target_fingerprint: "sha256:5a9705d60e769ce880c69c636987564ad7875f2b0e057d0e1423ddcef79998d6"
target_path: /Users/leote/code/projects/crowbar/src/app/routines.tsx
timestamp: 2026-09-10T17-59-59Z
slug: src-app-routines-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Refresh/save/archive feedback is strong; deletion lacks a busy and explicit success state. |
| 2 | Match System / Real World | 3 | Strength terminology is appropriate, but RPE/RIR and tempo still assume expertise. |
| 3 | User Control and Freedom | 4 | Back/cancel, dirty-state confirmation, removal undo, filters, retry, drag, and stepwise reorder are unusually complete. |
| 4 | Consistency and Standards | 3 | The system is cohesive, but the generic routine index is less ledger-like than the builder. |
| 5 | Error Prevention | 4 | Confirmation, reference blocking, duplicate prevention, constraints, dirty guards, and deferred validation are strong. |
| 6 | Recognition Rather Than Recall | 3 | Labels and visible controls help, but routine cards reveal too little and the filter taxonomy is hidden off-screen. |
| 7 | Flexibility and Efficiency | 3 | Search, filtering, quick-create, inline editing, dual-mode reorder, and undo help experts; no routine duplication or template path is visible. |
| 8 | Aesthetic and Minimalist Design | 3 | The compact hierarchy is disciplined, but populated rows still repeat five fields and four management controls. |
| 9 | Error Recovery | 3 | Errors are local and recoverable; blocked deletion has no direct resolution route and deletion completion is ambiguous. |
| 10 | Help and Documentation | 2 | Empty-state guidance and a tempo example help, but target semantics lack contextual explanation. |
| **Total** | | **31/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** Partly authored, with a strong product-specific builder and comparatively generic index. Ordered movement numbering, inline sets/reps/RPE-or-RIR/tempo targets, archived state, reversible reorder, and removal read as a serious strength-programming tool. The index exposes only a name, movement count, and generic CRUD actions, so it could belong to playlists, projects, or saved searches almost unchanged.

**Deterministic scan:** The required scan of `src/app/routines.tsx` returned zero findings. A separate scan of `src/features/routines` also returned zero findings. There were no detector rules, locations, or false positives to reconcile. The scan therefore remains clean but does not measure the recognition, flow, and density concerns in the human review.

**Visual overlays:** No browser/DOM-mutation surface was available, so no reliable user-visible overlay was created. Source inspection and both CLI scans were the fallback evidence.

## Overall Impression

This is a meaningful improvement. The builder is safer, calmer, more continuous, and much more credible on mobile. The condensed matrix and fixed save footer improve the core task, but density was compressed rather than fully redesigned: repeated rows still expose every editing decision. The biggest new opportunity is making the routine index carry enough training information for recognition without opening each routine.

## Progress Against the Previous Five Issues

| Previous issue | Result | Evidence |
|---|---|---|
| Ledger wall of forms | **Improved: P1 → P2** | Compact two-column targets and a fixed footer shorten the page, but every populated row still exposes five inputs plus drag, Up, Down, and Remove. |
| Stacked quick-create detour | **Resolved** | The picker closes before quick-create; saving transitions directly to target setup with an explicit Back to picker path. |
| Undersized mobile controls | **Resolved** | Critical movement controls now use 44pt minimum targets or enlarged hit slop, and reorder completion is announced. |
| Fresh builder opens with errors | **Resolved** | Name and target errors are gated by touched/submitted state; the empty ledger uses neutral guidance. |
| Archived filtering lacks feedback | **Resolved** | Refreshing now has visible progress, preserved-data explanation on failure, and a polite live region. |

## What's Working

- The builder now has authentic ledger character: ordered rows and a compact target matrix translate a training prescription into a dense working tool.
- Reversibility is excellent: users can cancel pending setup, protect dirty work, undo removal, and reorder with gesture or labeled buttons.
- State communication improved substantially through refresh feedback, stale-data context, deferred validation, normalized errors, fixed save status, and accessibility announcements.

## Cognitive Load

**High by the strict checklist: 4 of 8 failures, improved from 5 of 8.**

- **Chunking:** every movement still exposes five values plus reorder and removal controls.
- **One thing at a time:** target definition, ordering, and removal compete inside each populated row.
- **Minimal choices:** the movement picker exposes 15 muscle-group options in one horizontal strip.
- **Progressive disclosure:** instructions and destructive actions improve, but target fields and the full filter taxonomy remain immediately exposed.

Single focus, grouping, hierarchy, and working-memory support now pass.

## Emotional Journey

The index opens calmly and the builder now avoids reprimanding users before they act. Choosing or creating a movement flows forward into target setup, while a fixed footer keeps commitment visible. The remaining valley appears as routines grow: repeated dense rows turn planning into form maintenance, and the footer can describe the wrong blocker. High-stakes reassurance is excellent around unsaved work and blocked deletion, but permanent deletion ends ambiguously because the modal disappears before the async result and no explicit success follows.

## Priority Issues

1. **[P1] Routine cards do not support recognition at a glance**

   **Why it matters:** Similar routines expose only name and movement count, forcing lifters to open them one by one and weakening the product's ledger identity.

   **Fix:** Preview the first few ordered movements or a concise training-structure summary, with overflow summarized rather than increasing card height indefinitely.

   **Suggested command:** `$impeccable bolder`

2. **[P2] Populated rows still expose too many simultaneous controls**

   **Why it matters:** Condensation reduces height but not the number of decisions. Five inputs plus drag, Up, Down, and Remove repeat for every movement.

   **Fix:** Preserve inline editing but separate scan and edit more clearly—for example, a compact prescription line with a focused inline edit state, or a dedicated reorder mode that removes competing controls.

   **Suggested command:** `$impeccable distill`

3. **[P2] The muscle-group filter remains an unstructured 15-option strip**

   **Why it matters:** With the scroll indicator hidden, users cannot see the full taxonomy or know how much remains off-screen.

   **Fix:** Prioritize search and recent/common groups, then disclose the full taxonomy through a labeled picker or grouped control.

   **Suggested command:** `$impeccable distill`

4. **[P2] The fixed footer can report the wrong save blocker**

   **Why it matters:** It may say “Add a routine name and a Movement” even when both exist and an invalid target is the real problem.

   **Fix:** Derive footer copy from the first current validation failure and move focus or scroll to it after Save.

   **Suggested command:** `$impeccable clarify`

5. **[P2] Successful deletion lacks completion feedback**

   **Why it matters:** The confirmation closes before the async deletion completes, so disappearance and refresh are ambiguous during a consequential action.

   **Fix:** Keep deletion busy state visible, disable repeat actions, and announce “Routine deleted” through the existing success live region.

   **Suggested command:** `$impeccable harden`

## Persona Red Flags

- **Alex, impatient power user:** Inline targets, search, fixed Save, dual-mode reorder, and undo are efficient. Repeated target structures still lack duplication, presets, or batch application, and the 15-chip filter strip is slower than recent/favorite movements.
- **Sam, accessibility-dependent user:** Labels, live regions, 44pt controls, reorder announcements, and button alternatives are strong. Dense linear traversal remains tiring, while one-line routine names and footer descriptions may truncate under large text.
- **Casey, distracted mobile user:** The bottom Save surface and interruption protection are excellent. Repeated control-dense rows still raise accidental-edit risk; the filter chips have adequate effective hit areas but remain visually small and less confidence-inspiring.

## Minor Observations

- The builder title is centered in the remaining space after Back rather than the viewport.
- Success banners persist until another opening action clears them.
- “Restore” would align better than “Un-archive” with the existing “restored” success copy.
- The blocked-deletion sheet names references but offers no route to resolve them.
- Capitalized common nouns in sentences add institutional weight without improving comprehension.

## Questions to Consider

- If the product is a ledger, why does its index show less training information than a generic saved-items list?
- Can inline editing remain immediate while each movement reads as a prescription before it reads as a form?
- Are anatomy filters genuinely the fastest path, or would recent movements, favorites, and search better match advanced lifters?
- What explicit ending should permanent deletion have: confirmation, retained busy state, or a short undo window?
