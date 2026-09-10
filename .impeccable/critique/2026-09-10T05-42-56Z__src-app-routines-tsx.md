---
target: src/app/routines.tsx
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/leote/code/projects/crowbar/src/app/routines.tsx"
target_fingerprint: "sha256:5a9705d60e769ce880c69c636987564ad7875f2b0e057d0e1423ddcef79998d6"
target_path: /Users/leote/code/projects/crowbar/src/app/routines.tsx
timestamp: 2026-09-10T05-42-56Z
slug: src-app-routines-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading, saving, success, errors, and undo are visible; changing “Show archived” leaves stale rows visible with no in-flight cue. |
| 2 | Match System / Real World | 3 | Strong lifter vocabulary and natural routine order, but RPE/RIR and tempo notation have no proactive explanation. |
| 3 | User Control and Freedom | 3 | Unsaved-change guards, cancel paths, filter clearing, and removal undo are strong; permanent deletion has no recovery. |
| 4 | Consistency and Standards | 3 | Tokens and component patterns are cohesive; identical Back and Close actions plus the stacked-modal quick-create detour weaken predictability. |
| 5 | Error Prevention | 3 | Invalid save is blocked, fields are constrained, deletion checks references, and duplicates are prevented; blank-state errors appear before interaction. |
| 6 | Recognition Rather Than Recall | 3 | Fields and actions are labeled, with visible counts and examples; the post-create continuation asks users to infer hidden builder state. |
| 7 | Flexibility and Efficiency | 2 | Search, filters, quick-create, drag, and arrow reordering exist, but there is no compact prescription editing, duplication, reuse, or batch path. |
| 8 | Aesthetic and Minimalist Design | 2 | The restrained palette and spacing are clean, but every optional target and editing control stays expanded for every ledger entry. |
| 9 | Error Recovery | 3 | Inline validation, retry, draft preservation, blocked-deletion references, and undo are solid; raw Error.message values may expose non-actionable failures. |
| 10 | Help and Documentation | 1 | Apart from placeholders and validation copy, there is no contextual explanation of targets or notation. |
| **Total** | | **26/40** | **Acceptable; significant improvements needed** |

## Design Specificity Verdict

**LLM assessment:** Moderately authored, but structurally interchangeable. “Routine,” “Ledger,” “Movement,” working sets, rep ranges, RPE/RIR, and tempo clearly belong to Crowbar, while the restrained monochrome system fits its professional strength-ledger positioning. Yet the index remains a conventional CRUD list and the builder a generic stack of cards and fields. Product specificity currently lives more in nouns than composition; each movement should read like a compact training prescription rather than expand into a long generic form.

**Deterministic scan:** The required scan of `src/app/routines.tsx` returned zero findings. Because that file is only a re-export, a second narrow scan of `src/features/routines` was run and also returned zero findings. There were no detector rules, locations, or false positives to reconcile. The detector therefore adds a clean static signal but does not contradict the human review: its rules do not measure the form density, flow continuity, or native target-size problems found here.

**Visual overlays:** No browser/DOM-mutation tool, Playwright/Puppeteer dependency, or browser executable was available, so no reliable user-visible overlay was created. Source inspection plus both CLI scans were used as the fallback signal.

## Overall Impression

The screen is calm, coherent, and unusually strong on recovery. Its main weakness is architectural rather than cosmetic: a routine meant to be scanned like a ledger becomes a wall of repeated forms. The biggest opportunity is to make the saved prescription the dominant object and reveal editing controls only on demand.

## What's Working

- The domain language is disciplined and useful. “Ledger,” “working sets,” “rep range,” and scale-specific targets make the surface feel intended for serious training.
- Recovery is thoughtful: removal Undo, unsaved-change protection, retry states, duplicate prevention, destructive confirmation, and explicit dependency references reduce fear while editing.
- The implementation follows the documented visual system closely: restrained role colors, 12px cards, compact spacing, an 800px content cap, and one decisive primary save surface.

## Cognitive Load

**High: 5 of 8 checklist items fail.**

- **Chunking:** each entry exposes five target values plus drag, reorder, clear, and remove controls at once.
- **Visual hierarchy:** optional metadata receives nearly the same weight as movement identity and order; Save can sit several screens below the current context.
- **One thing at a time:** the full ledger remains editable while a separate pending “Configure Movement” card is also visible.
- **Minimal choices:** a populated entry presents at least nine simultaneous controls, and the movement picker exposes 15 muscle-group filters alongside search, create, and selection.
- **Progressive disclosure:** completed entries remain fully expanded even during order review or movement addition.

Single task focus, proximity grouping, and low cross-screen memorization pass.

## Emotional Journey

The index starts calm and confident, with a strong title, one decisive create action, compact rows, and a useful empty state. The experience dips when a fresh builder immediately shows errors, then dips again when creating a missing movement stacks an editor over the picker and inserts a separate continuation step before target configuration. High-stakes moments perform much better: unsaved edits have a clear keep/discard decision, removal has Undo, deletion names the consequence, and blocked deletion explains dependencies. Saving ends with concise confirmation, though it does not visibly anchor the saved routine's new position.

## Priority Issues

1. **[P1] The ledger becomes a wall of forms**

   **Why it matters:** Every movement permanently exposes optional prescription fields and editing controls. A realistic routine becomes difficult to scan, and Save moves several screens away.

   **Fix:** Render compact prescription rows such as “4 × 6–8 · RPE 8 · 3-1-1-0,” allow one focused row to expand at a time, and keep Save in a sticky footer.

   **Suggested command:** `$impeccable distill`

2. **[P1] Quick-create breaks continuity with a stacked-modal detour**

   **Why it matters:** Creating a missing movement opens an editor over the still-mounted picker, then returns to a created notice with a separate “Continue to target setup” step while configuration waits behind it. Users must reconstruct where they are.

   **Fix:** Make creation a single forward transition—create → configure targets—with an explicit back path to the picker and no intermediate confirmation.

   **Suggested command:** `$impeccable shape`

3. **[P1] Critical mobile controls use undersized targets**

   **Why it matters:** Drag, reorder, remove, and Clear live in the densest and most error-prone part of the screen, yet small/icon controls resolve around 32–36pt.

   **Fix:** Give essential native actions a 44pt hit area while preserving compact visuals with invisible padding or row-level gestures, and announce reorder results.

   **Suggested command:** `$impeccable audit`

4. **[P2] A fresh builder opens in an error state**

   **Why it matters:** Destructive-colored name and ledger errors appear before the user has attempted anything, turning a blank canvas into a reprimand.

   **Fix:** Gate validation styling behind touched/submitted state. Use neutral empty-ledger guidance with an inline Add movement action.

   **Suggested command:** `$impeccable onboard`

5. **[P2] Archived filtering lacks transitional feedback**

   **Why it matters:** Toggling “Show archived” starts a reload, but existing rows remain unchanged with no busy cue, making the switch feel ineffective.

   **Fix:** Preserve the list while showing inline progress and a busy state beside the filter, then announce completion.

   **Suggested command:** `$impeccable harden`

## Persona Red Flags

- **Alex, impatient power user:** Building a six-movement routine means traversing six identical expanded field groups. There is no duplicate-target, apply-to-many, compact keyboard progression, or collapsed review mode. Quick-create adds an avoidable modal round trip.
- **Sam, accessibility-dependent user:** Critical controls are only 32–36pt. Accessible labels improve `≡`, `↑`, and `↓`, but there is no live announcement of the new position after reorder. Long expanded entries also create a punishing linear screen-reader path.
- **Casey, distracted mobile user:** Both exits are at the top while Save sits after the growing ledger. Repeated scrolling separates context from commitment, and small Clear/reorder controls invite mistaps. Draft-loss protection helps, but adds another modal decision when interrupted.

## Minor Observations

- Back and Close invoke the same callback on opposite sides of the builder title, adding ambiguity and crowding narrow widths.
- The horizontal muscle-group strip hides its scroll indicator, so later filters may be undiscoverable.
- Archived status appears after More rather than beside the routine identity, weakening scan order on small screens.
- The success banner persists until another create/edit action; a dismissible or brief treatment would keep the ledger compact.
- Passing raw `Error.message` into UI risks leaking database-centric copy into otherwise careful recovery states.

## Questions to Consider

- What if each routine entry looked like a real training prescription first, and became a form only when tapped?
- If all entry targets are optional, why do they occupy more visual space than movement order—the routine's only mandatory structure?
- Could creating a missing movement be one branch of selection rather than a modal layered over another modal?
- If Back and Close are identical, what distinct user mental models are they meant to serve?
