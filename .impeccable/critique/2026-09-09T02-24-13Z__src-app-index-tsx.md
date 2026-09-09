---
target: src/app/index.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/leote/code/projects/crowbar/src/app/index.tsx"
target_fingerprint: "sha256:c0298e1e605dc96828658d6092efe4ba0aff12fa757009ec74bb12ee0d554435"
target_path: /Users/leote/code/projects/crowbar/src/app/index.tsx
timestamp: 2026-09-09T02-24-13Z
slug: src-app-index-tsx
---
Method: dual-agent (A: design-director review subagent · B: detector/browser evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1/4 | Catalog loading and load failures are not surfaced to users. |
| 2 | Match System / Real World | 3/4 | Movement, muscle group, archive, references, and set history fit the domain. |
| 3 | User Control and Freedom | 2/4 | Cancel/close exist, but archive has no undo and blocked deletion has no next step. |
| 4 | Consistency and Standards | 3/4 | Strong visual consistency, but automatic appearance conflicts with forced dark mode. |
| 5 | Error Prevention | 3/4 | Duplicate detection, validation, reference guards, and delete confirmation are solid. |
| 6 | Recognition Rather Than Recall | 2/4 | Search and labels help, but filters and editability are partly implicit. |
| 7 | Flexibility and Efficiency | 2/4 | Search/filter compose well, but there is no bulk action, result count, or fast power-user path. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Calm ledger language; the 15-pill filter rail adds noise. |
| 9 | Error Recovery | 2/4 | Mutation errors exist, but load errors and reference blockers are weakly recoverable. |
| 10 | Help and Documentation | 1/4 | No first-run orientation or explanation of archive versus permanent deletion. |
| **Total** | | **22/40** | **Needs focused improvement in status, recovery, and choice architecture.** |

### Cognitive load

High risk: 4 checklist failures (single focus, chunking, minimal choices, and progressive disclosure). The surface presents 15 visible filter options (`All` plus 14 muscle groups), while row actions and archive state add hidden/implicit decisions. Search, filters, and archived visibility compose cleanly, but there is no result count, clear-filters action, loading state, or explicit next action.

## Design Specificity Verdict

**Visually specific, behaviorally generic.** The rendered surface follows Crowbar's Strength Ledger well: centered 800px column, 16px gutters, flat tonal cards, system typography, monotone palette, 12px containers, and pill filters (`src/features/catalog/catalog-screen.tsx:180-235`, `src/features/catalog/movement-row.tsx:28-50`). But its interaction model still reads like a conventional CRUD catalog: generic “+”, “More”, hidden row actions, and modal flows do not yet express much Crowbar-specific character.

The detector found **0 findings**: `impeccable detect --json src/app/index.tsx` exited 0 with `[]`. There are no deterministic locations or false positives to reconcile. Browser visualization was unavailable because no browser automation runtime was exposed, so no live overlay or screenshot evidence is claimed.

## Overall Impression

A disciplined, credible catalog with a strong visual system and unusually thoughtful data-safety guardrails. The biggest opportunity is to make state and next actions legible: users should never wonder whether the catalog is loading, whether an archive succeeded, what a filter changed, or what to do when a referenced movement cannot be deleted.

## What's Working

- The material language is coherent and product-appropriate: dense, monochrome, flat, and scannable rather than fitness-app decorative.
- Data safety is strong: duplicate checks, validation, historical-reference protection, and delete confirmation build trust (`src/features/catalog/movement-editor-modal.tsx:163-225`, `src/features/catalog/catalog-screen.tsx:161-175`).
- Archived entries are visually subordinate with a trailing machine-label tag, matching the design system (`src/features/catalog/movement-row.tsx:28-50`).

## Priority Issues

1. **[P1] Silent loading and failure states**
   - **Why it matters:** Users can mistake an empty or stale catalog for successful loading; database failures only reach the console (`src/features/catalog/catalog-screen.tsx:84-101`).
   - **Fix:** Add a compact loading state, an inline retryable error state, and preserve prior rows during refresh.
   - **Suggested command:** `/impeccable harden`

2. **[P1] The filter rail overloads the primary surface**
   - **Why it matters:** Fifteen equal-weight pills compete with search and Add, while horizontal overflow hides taxonomy choices (`src/features/catalog/catalog-screen.tsx:218-235`).
   - **Fix:** Label the control, move the full taxonomy into a compact chooser, and show active-filter/result context plus a clear-filters action.
   - **Suggested command:** `/impeccable distill`

3. **[P1] Reference blocking is informative but not actionable**
   - **Why it matters:** A user who cannot delete a referenced movement gets a list and only Close, with no route to resolve the dependency (`src/features/catalog/references-modal.tsx:19-37`). Silent archive removal can also feel like data loss.
   - **Fix:** Add navigable “Open routine/session” actions or a clear archive recommendation, then provide undo feedback after archive.
   - **Suggested command:** `/impeccable clarify`

4. **[P1] Appearance behavior contradicts the product contract**
   - **Why it matters:** `app.json:8` requests automatic appearance while `_layout.tsx:40-49` forces dark mode, undermining the documented first-class light/dark system.
   - **Fix:** Honor system appearance or explicitly make dark-only a product decision; verify legacy navigation and token surfaces stay aligned.
   - **Suggested command:** `/impeccable audit`

5. **[P2] Important selection semantics and touch targets are incomplete**
   - **Why it matters:** Filter, muscle-group, and unit selection is visual-only; compact controls use 12px text and 32px minimum height, below the system's preferred target (`src/features/catalog/catalog-screen.tsx:225-233`, `src/features/catalog/movement-editor-modal.tsx:269-289`, `src/components/ui/button/index.tsx:40-64`).
   - **Fix:** Expose `accessibilityState={{ selected }}`, establish heading/modal semantics, and increase critical touch targets to at least 36px.
   - **Suggested command:** `/impeccable adapt`

## Persona Red Flags

- **Alex, power user:** No bulk archive/delete, no result count, and maintenance actions require opening each row's secondary menu.
- **Jordan, first-timer:** The first surface is an admin catalog with seeded movements; “+” and row tapping do not explain the next training action.
- **Accessibility-focused lifter:** Selection state is visual-only, and muted archived/error/reference content may not carry enough semantic emphasis.

## Minor Observations

- Search correctly follows the catalog's special recessed 12px field rule (`src/features/catalog/catalog-screen.tsx:206-216`).
- Replace the literal “+” with a familiar add icon plus “Add movement” where space permits.
- Include the movement name in “Cannot delete movement” for stronger context.
- The target file is a thin entry point; the meaningful review surface is its `CatalogScreen` implementation.

## Questions to Consider

- Is Catalog the product's first promise, or setup? **Start recording from this surface** / **keep Catalog as the home screen** / **add a clearer route to a session**.
- Which issue should come first? **Loading/error recovery** / **filter simplification** / **destructive-action recovery**.
- What scope do you want? **Top 3 issues** / **all five** / **accessibility and reliability only**.
