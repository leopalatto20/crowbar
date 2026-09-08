---
name: Crowbar
description: Local-first strength training ledger for advanced lifters
colors:
  primary: "#171717"
  primary-foreground: "#FAFAFA"
  card: "#FFFFFF"
  secondary: "#F5F5F5"
  secondary-foreground: "#171717"
  background: "#FFFFFF"
  popover: "#FFFFFF"
  popover-foreground: "#0A0A0A"
  muted: "#F5F5F5"
  muted-foreground: "#737373"
  destructive: "#E7000B"
  destructive-foreground: "#FAFAFA"
  foreground: "#0A0A0A"
  border: "#E5E5E5"
  input: "#E5E5E5"
  ring: "#D4D4D4"
  accent: "#F7F7F7"
  accent-foreground: "#343434"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.08
  headline:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "12px"
  full: "9999px"
spacing:
  half: "2px"
  one: "4px"
  two: "8px"
  three: "16px"
  four: "24px"
  five: "32px"
  six: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "rgba(23, 23, 23, 0.9)"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    padding: "2px 12px"
  chip-unselected:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 12px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "36px"
---

# Design System: Crowbar

## Overview

**Creative North Star: "The Strength Ledger"**

Crowbar is a professional instrument for recording training, not a fitness app that wants to be liked. The interface behaves like a good training ledger: dense, legible, monotone, and completely uninterested in decoration. Every screen is a column of facts — movements, sets, landmarks — and the chrome around those facts exists only to keep them scannable at a glance between sets.

The material language is machined metal and paper. Warm neutrals run from Bare Steel white to Anodized Black; the only decisive surface is the near-black (or warm ivory, in dark mode) action color, which appears exactly when something is selected or about to be committed. Radii are kept to a three-step ladder, spacing to a 4px scale, and depth is conveyed by tonal layering alone — the system contains one faint functional shadow and uses it only on interactive fields.

Dark mode is a first-class citizen, shipped from the same role tokens (`primary`, `card`, `muted`…) rather than a sepia re-tint. The palette flips into a warm dark: ivory action surfaces on an anodized near-black ground.

**Key Characteristics:**
- Monochrome warm neutrals; single decisive action color that inverts between modes
- Flat-by-default surfaces; depth through tonal layering, not shadows
- System typography only — SF Pro / Roboto; no downloaded fonts
- Three-step radius ladder (6px controls / 12px containers / full pills)
- 4px spacing scale, 16px gutters, max content width 800px
- Machine-label typography (uppercase, bold, muted) reserved for status tags

## Colors

A warm-neutral monochrome palette with one decisive inversion: near-black in light mode, warm ivory in dark mode. Every color is a role token defined in light and dark; screens never reference raw values.

### Primary
- **Anodized Black** (#171717 / dark: **Warm Ivory** #FFF5F5): The single decisive surface — solid buttons, the selected filter chip, focus rings on switches. It is the only aggressive color and it marks exactly one commitment per view.
- **Primary Foreground** (#FAFAFA / dark: #171717): Text and icons on primary surfaces. Inverts with its pair.

### Secondary (functional)
- **Safety Red** (#E7000B / dark: **Safety Red Soft** #FF6467): Destructive actions and invalid field borders only. Never used expressively; its job is to say "stop" or "this is wrong."

### Neutral
- **Bare Steel** (#FFFFFF / dark: **Anodized Void** #0A0A0A): The ground. Screen background on which everything sits.
- **Machine Black** (#0A0A0A / dark: **Bare Steel** #FAFAFA): Primary text and the `foreground` role.
- **Ground Plate** (#FFFFFF / dark: **Plate Steel** #171717): Cards, rows, popovers. In light mode the plate is indistinguishable from the ground — separation is carried by structure and spacing, not paint.
- **Paper Steel** (#FFFFFF, `popover` role / dark: #171717): Floating overlays, menus.
- **Mill Finish** (#F5F5F5 / dark: **Charred** #262626): Muted/secondary fills — secondary buttons, the muted surface under content.
- **Bead Blast** (#F7F7F7 / dark: **Charred** #262626): Hover/active fills on outline buttons, ghost buttons, and the `accent` role; `accent-foreground` #343434 / dark #FAFAFA.
- **Iron Grey** (#737373 / dark: #A1A1A1): `muted-foreground` — placeholders, secondary copy, empty states, archived labels.
- **Burr Line** (#E5E5E5 / dark: **Burr Dark** #2E2E2E): `border` and `input` strokes — the one-pixel outlines on fields and outline buttons, nothing else.
- **Focus Ring** (#D4D4D4 / dark: #737373): `ring` — web focus indication.
- **Graphite** (#343434): `accent-foreground` text on hover fills (light mode).

**The One-Surface Rule.** The primary color (Anodized Black or Warm Ivory) appears on at most one element per view. Its rarity is the point: when the eye finds a solid dark shape, it knows that is the decision.

## Typography

**Display Font:** System UI — SF Pro on iOS/macOS, Roboto on Android, system-ui on web
**Body Font:** Same system stack; no second font.
**Label/Mono Font:** System monospace only for code/identifiers (legacy `ThemedText` code style, 12px).

**Character:** The interface never competes with the data. System faces carry the tonal hierarchy on weight and size alone; the ledger's authority comes from density and alignment, not letterforms.

### Hierarchy
- **Display** (700, 48px/52px, 1.08): Page titles ("Catalog"). One per screen, at the top of the column, no subheads at this size.
- **Headline** (700, 30px): Section titles within a surface.
- **Title** (600, 24px): Card and panel titles, routine names.
- **Body** (400, 16px/24px, 1.5): Default text, movement names, list content. Keep prose lines to 65–75ch on web.
- **Label** (500, 14px): Chips, buttons, secondary rows. The **machine label** variant — 12px, 700 weight, uppercase — is reserved for status tags such as "Archived".

### Named Rules
**The System-Font Rule.** No downloaded or custom fonts, ever. SF Pro and Roboto *are* the identity; a distinct typeface would make the ledger feel like a branded artifact instead of an instrument.
**The Machine-Label Rule.** Uppercase bold microcopy (12px, 700) is the only sanctioned ornament. It appears solely as a status tag, muted, at the end of a row — never as body text, never in the primary color.

## Layout

Single centered column, mobile-first, `max-width: 800px` on web. Screen padding is 16px (`px-4`); vertical rhythm between list rows and header blocks is 16px (`gap-4`), with an 8px (`gap-2`) rhythm inside rows and chip clusters. The bottom of scrollable lists carries 112px of inset so the last row clears the tab bar.

Density is professional and compact: rows are 16px-padded cards, interactive controls are `min-height 36px`, and a full-width data list is the normal state — a screen is a ledger page, not a feed. The spacing ladder is fixed at 2/4/8/16/24/32/64px (`half`/`one`/`two`/`three`/`four`/`five`/`six`); a 12px step exists for control padding (`px-3`).

There are no bespoke breakpoints: layout is single-column everywhere, and the only adaptive behavior is the navigation chrome (floating pill on web, native tab bar on iOS/Android).

**The 800-Rule.** No content column ever exceeds 800px, even on wide desktop web. The ledger stays a column; whitespace goes to the sides, never inside.

## Elevation & Depth

**Flat-by-default.** Surfaces sit flush. Depth is carried by tonal layering — ground, plate, and mill-finish greys stack to separate content — plus spacing and hairlines. Shadows are not part of the resting vocabulary.

### Shadow Vocabulary
- **Field Cue** (`0 1px 2px rgb(0 0 0 / 0.05)` — Tailwind `shadow-xs`): The system's only shadow. It sits on inputs and outline buttons — interactive fields — as a tactile cue that these elements receive input. It is a functional affordance, not an ambient glow.

**The Flat-By-Default Rule.** At rest, nothing casts a shadow. Elevation is earned by interactivity: fields get the Field Cue, hover and pressed states shift fill alpha (90% primary, 80% secondary), and web focus is a 2px ring — never a drop shadow.

## Shapes

Radius follows a three-step ladder and nothing between: **6px** (`rounded-md`) for controls — buttons, inputs, switches in invalid state — **12px** (`rounded-xl`) for containers — cards, rows, empty states — and **full** (`rounded-full`) for pills — filter chips, muscle-group tags, the floating web nav, the native switch. While the 12px cards use 6px controls on them, controls never sit at 12px and containers never sit at 6px.

Borders are 1px `border`/`input` strokes, used only on fields and outline buttons; cards are borderless and separated by tonal layering. Corners are never clipped, cut, or beveled — geometry is simple and complete.

**The No-Hybrid-Radius Rule.** A radius must be one of the three steps. 4px squares and 8–10px compromises read as a different (and softer) system; they are not in the language.

## Components

### Buttons
- **Shape:** 6px radius (`rounded-md`), full-width of content, `min-height 36px` default.
- **Primary:** Anodized Black (dark: Warm Ivory) with inverted text (#FAFAFA / #171717). Padding 8px 16px, `text-sm`. Hover/active: 90% fill alpha.
- **Focus:** Web focus-visible shows a 2px ring in the ring color; focus ring shadows on destructive use a red-tinted ring.
- **Secondary:** Mill Finish fill, inverted text; 80% alpha on hover.
- **Outline:** 1px Burr Line border on transparent ground, text `foreground`; hover fills Bead Blast, text switches to `accent-foreground`. Carries the Field Cue shadow.
- **Ghost:** No stroke, no fill at rest; hover fills Bead Blast.
- **Link:** Primary-colored text, underline appears on hover/active only.
- **Destructive:** Safety Red fill with inverted text; 90% alpha on hover. Reserved for irreversible actions.
- **Sizes:** `sm` (28px min-height, 12px text), `default`, `lg` (40px min-height, 32px horizontal padding), `icon` (36×36px square). Disabled: 40% opacity, no interaction.

### Chips (filters & tags)
- **Style:** Full-radius pills, `text-sm`. Filter chips are sized `sm`; content tags use 2px vertical / 8px horizontal padding.
- **States:** Selected = solid Primary fill with inverted text (the one decisive surface per view). Unselected = outline chip: Burr Line border on transparent ground, `foreground` text, hover fills Bead Blast. Content tags (e.g. muscle-group labels) are strokeless and quiet; muted content uses Iron Grey text.

### Cards / Containers
- **Corner Style:** 12px radius (`rounded-xl`).
- **Background:** `card` (Ground Plate light / Plate Steel dark).
- **Shadow Strategy:** None at rest — see The Flat-By-Default Rule.
- **Border:** None; separation comes from tonal layering and the 8–16px gutters between cards.
- **Internal Padding:** 16px on all sides for rows (`px-4 py-4`); empty states drop to 8px vertical (`py-8`, centered).
- **Muted rows:** Archived entries render the same card at 50% opacity with a trailing machine-label tag.

### Inputs / Fields
- **Style:** 1px Burr Line stroke, `6px` radius, transparent background (sits directly on its surface), `min-height 36px`, `text-sm`, `foreground` text, Iron Grey placeholder.
- **Focus:** Stroke shifts to `ring`, plus a 2px `ring/50` web halo. No glow, no scale.
- **Invalid:** 40%-alpha Safety Red stroke plus a red-tinted web ring.
- **Disabled:** 50% opacity, inert.
- **Search variant:** The catalog search field swaps to `rounded-xl` (12px) with a `card` fill and no stroke — it reads as a control recessed into the header rather than a field.
- **Base stroke note:** The component's resting stroke uses the `input` role, visually identical to `border`; both exist in the token set (input = interactive stroke, border = structural).

### Switch
- Native platform switch (iOS/Android), default size. Web focus shows a 2px solid Primary ring. Never restyled away from platform expectations.

### Navigation
- **Web:** A floating top pill — up to 800px wide, full-radius, `backgroundElement`-tinted (legacy #F0F0F3 light / #212225 dark) — with the "Crowbar" brand (14px, 700) pinned left and tab buttons inside. The active tab fills a darker `backgroundSelected` plate; idle tabs sit on the pill fill with secondary text. Pressed rows drop to 70% opacity. *(This chrome is currently built from the legacy `Colors` constants in `src/constants/theme.ts`, not the global.css token roles — see Do/Don't below.)*
- **Native:** System native tab bar via expo native tabs, tinted with the same background/backgroundElement text roles.

### Empty State
- A centered 12px-radius `card` plate, `padding: 32px 16px`, with one line of Iron Grey text ("No movements match"). No illustration, no animation — an empty ledger page says what it means in one line.

## Do's and Don'ts

### Do:
- **Do** build structure from the neutral ladder — ground, plate, mill finish — and treat the primary surface as the single decision point per view.
- **Do** use the fixed spacing ladder (4/8/16/24/32/64px) and the 16px gutter rhythm; the ledger's calm depends on predictable rhythm.
- **Do** keep radii on the three-step ladder: 6px controls, 12px containers, full pills.
- **Do** support both modes from the same role tokens; a new screen must look right in Warm Ivory dark just by virtue of using `card`, `muted`, and `foreground` roles.
- **Do** keep interactive elements at `min-height 36px` and body text at 16px — density is the product.
- **Do** reserve uppercase bold microcopy for status machine labels like "Archived".
- **Do** cap content columns at 800px.

### Don't:
- **Don't** introduce accent hues, gradients, imagery, or emoji — the palette is steel and ivory; a second hue breaks the ledger's authority.
- **Don't** add drop shadows or glow at rest; flat is the identity, and the Field Cue on inputs is the only sanctioned shadow.
- **Don't** use radii outside the ladder, and never put 12px radius on a control.
- **Don't** load custom fonts or brand the type; system faces are the identity.
- **Don't** render more than one primary-colored element per view.
- **Don't** uppercase body or label copy — only machine status tags.
- **Don't** mix the legacy `Colors` constants into new screens; new work uses the `global.css` role tokens, and the legacy nav chrome is slated to migrate once its tab patterns stabilize.