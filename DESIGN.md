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
    lineHeight: 1
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
    height: "36px"
  button-primary-hover:
    backgroundColor: "rgba(23, 23, 23, 0.9)"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  chip-unselected:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "36px"
  nav-pill:
    backgroundColor: "#F0F0F3"
    textColor: "#0A0A0A"
    rounded: "32px"
    padding: "8px 32px"

---

# Design System: Crowbar

## Overview

**Creative North Star: "The Strength Ledger"**

Crowbar is a professional instrument for recording training, not a fitness app that wants to be liked. The interface behaves like a good training ledger: dense, legible, monotone, and uninterested in decoration. Every screen is a column of facts — movements, sets, landmarks — and the chrome exists only to keep them scannable at a glance between sets.

The material language is machined metal and paper. Warm neutrals run from Bare Steel white to Anodized Black; the only decisive surface is the near-black (or warm ivory, in dark mode) action color, appearing when something is selected or committed. Radii follow a small ladder, spacing follows a 4px scale, and depth is primarily tonal. The implementation supports light and dark role tokens, although the current app root forces the dark provider mode while automatic appearance remains declared in app configuration.

**Key Characteristics:**
- Monochrome warm neutrals; one decisive action surface
- Flat-by-default surfaces; depth through tonal layering
- System typography only — SF Pro / Roboto / system UI
- 6px controls, 12px containers, full-radius pills
- 4px spacing scale, 16px gutters, max content width 800px
- Uppercase machine labels reserved for status tags

## Colors

A warm-neutral monochrome palette with one decisive inversion. The canonical source is the role-token layer in `src/global.css`; the frontmatter records its light values and the dark counterparts are described below.

### Primary
- **Anodized Black / Warm Ivory** (`#171717` / dark `#FFF5F5`): Solid buttons and selected controls. Its rarity marks the decision surface.
- **Primary Foreground** (`#FAFAFA` / dark `#171717`): Inverted text and icons on primary surfaces.

### Secondary
- **Safety Red / Safety Red Soft** (`#E7000B` / dark `#FF6467`): Destructive actions and invalid fields only.

### Neutral
- **Bare Steel / Anodized Void** (`#FFFFFF` / dark `#0A0A0A`): Screen ground.
- **Ground Plate / Plate Steel** (`#FFFFFF` / dark `#171717`): Cards, rows, and popovers.
- **Mill Finish / Charred** (`#F5F5F5` / dark `#262626`): Secondary surfaces and muted fills.
- **Bead Blast / Charred** (`#F7F7F7` / dark `#262626`): Hover and active fills.
- **Machine Black / Bare Steel** (`#0A0A0A` / dark `#FAFAFA`): Primary text.
- **Iron Grey** (`#737373` / dark `#A1A1A1`): Placeholders, secondary copy, and archived labels.
- **Burr Line / Burr Dark** (`#E5E5E5` / dark `#2E2E2E`): Borders and field strokes.
- **Focus Ring** (`#D4D4D4` / dark `#737373`): Focus indication.

**The One-Surface Rule.** The primary color appears on at most one decisive element per view. Its rarity tells the user where commitment happens.

## Typography

**Display Font:** System UI — SF Pro on Apple platforms, Roboto on Android, system-ui on web
**Body Font:** The same system stack
**Label/Mono Font:** System monospace only for identifiers and legacy code styles

**Character:** Typography stays quiet so the data can carry authority. Weight and size create hierarchy; no downloaded or custom font is part of the identity.

### Hierarchy
- **Display** (700, 48px/48px, 1): Page titles such as “Catalog”, one per screen.
- **Headline** (700, 30px/36px, 1.2): Section titles.
- **Title** (600, 24px/30px, 1.25): Card and panel titles.
- **Body** (400, 16px/24px, 1.5): Movement names and list content.
- **Label** (500, 14px/20px, 1.4): Buttons, chips, and secondary rows.
- **Machine label** (700, 12px, uppercase): Muted status tags such as “Archived” only.

**The System-Font Rule.** Do not load custom fonts. SF Pro, Roboto, and system UI are the identity.

## Layout

The app uses a single centered column. Web content is capped at 800px, with 16px screen gutters and 16px vertical gaps between header blocks and rows. Chip clusters and compact row content use 8px gaps. Scrollable catalog content reserves 112px of bottom inset so the final row clears navigation.

Density is professional and compact: catalog rows use 16px padding, inputs are 36px high, and the list is a full-width ledger rather than a feed. The spacing ladder is 2/4/8/16/24/32/64px. Adaptation is platform-based rather than breakpoint-led: web uses a floating navigation pill, while native uses Expo router tabs.

**The 800-Rule.** No web content column exceeds 800px; extra width stays as side whitespace.

## Elevation & Depth

The system is flat by default. Ground, plate, muted fill, spacing, and hairlines establish depth. The only sanctioned shadow is the Field Cue on inputs and outline buttons, where it signals an interactive surface. Catalog search is a recessed card-filled field without a border.

### Shadow Vocabulary
- **Field Cue** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): The functional shadow on inputs and outline buttons. It is not an ambient elevation effect.

**The Flat-By-Default Rule.** Do not add resting drop shadows or glows. State changes use fill alpha, border shifts, focus rings, and pressed opacity rather than transforms.

## Shapes

Controls use a 6px radius, containers and rows use 12px, and chips/tags use full radius. Fields and outline buttons use 1px role-token strokes; cards are borderless and separated by tonal layering and gutters.

The floating web navigation is a documented implementation exception: its outer container uses a 32px radius and its tab plate uses 16px. The switch implementation also currently uses a 12px track radius. New feature surfaces should use the three-step ladder unless they are extending these existing platform chrome patterns.

**The No-Hybrid-Radius Rule.** New controls and containers must use only the established radius steps; do not introduce intermediate 4px or 8–10px radii.

## Components

### Buttons
- **Shape:** 6px radius; default buttons resolve to 36px with 8px vertical and 16px horizontal padding.
- **Primary:** Primary role fill with inverted foreground; hover/active shifts to 90% alpha.
- **Outline:** 1px border, ground background, Field Cue shadow; hover/active fills the accent role.
- **Secondary:** Muted fill; hover/active shifts to 80% alpha.
- **Ghost / Link:** No resting fill or stroke; hover/active reveals accent or underline.
- **Destructive:** Safety Red fill, with a softer dark-mode treatment in the current component implementation.
- **Small:** 32px minimum height, 12px text, and compact padding. Use only for secondary controls such as filter chips.
- **Icon:** 36px square minimum size.

### Chips
- **Style:** Full-radius 32px filter buttons with 12px horizontal padding and 12px text.
- **State:** Selected chips use the primary surface. Unselected chips use a 1px outline and fill with the accent role on interaction.
- **Tags:** Movement metadata tags remain quiet and muted, while status tags use the machine-label treatment.

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** Card role; light Ground Plate or dark Plate Steel.
- **Shadow Strategy:** None for resting cards.
- **Border:** None; separation comes from tonal layering and spacing.
- **Internal Padding:** 16px for ledger rows; empty states use larger vertical breathing room.
- **Archived rows:** 50% opacity with a trailing muted machine label.

### Inputs / Fields
- **Base style:** 36px minimum height, 6px radius, 1px border, transparent light background, dark `input` fill, 12px horizontal padding, and Field Cue shadow.
- **Focus:** Border shifts to the ring role with a 2px web ring halo.
- **Invalid / disabled:** Safety Red border and ring for invalid fields; 50% opacity and inert interaction when disabled.
- **Search:** Catalog search overrides the base field with a 12px radius, card fill, and no border.

### Navigation
- **Web:** A floating centered pill up to 800px wide. The current implementation uses legacy theme constants: light `#F0F0F3`/`#E0E1E6`, dark `#212225`/`#2E3135`, and muted tab text. The outer container is 32px radius; the active tab is 16px radius; pressed rows drop to 70% opacity.
- **Native:** Expo router tabs use the same legacy navigation color roles and platform-native tab behavior.

## Do's and Don'ts

### Do:
- **Do** build new surfaces from the global role tokens in `src/global.css`.
- **Do** use the 4/8/16/24/32/64px spacing rhythm and 16px gutters.
- **Do** keep new controls at 6px, new containers at 12px, and new pills at full radius.
- **Do** support both token modes, and verify both light and dark class states when changing UI.
- **Do** keep important interactive targets at least 36px high.
- **Do** reserve uppercase bold microcopy for muted status labels.
- **Do** cap web content columns at 800px.

### Don't:
- **Don't** introduce accent hues, gradients, imagery, or emoji into the ledger interface.
- **Don't** add ambient shadows or glow; use the Field Cue only on interactive fields and outline buttons.
- **Don't** introduce new radius values outside the established ladder.
- **Don't** load custom fonts or mix brand typefaces.
- **Don't** use more than one decisive primary surface per view.
- **Don't** uppercase ordinary body or label copy.
- **Don't** use legacy `Colors` constants in new feature screens; legacy navigation is the current documented exception pending migration.
