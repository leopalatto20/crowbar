# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Expo SDK 57, React Native, Expo Router, NativeWind, Gluestack UI, Drizzle ORM, and Expo SQLite.

## Users

One serious or advanced lifter, working alone on their own device while building or editing a workout routine.

## Product Purpose

Crowbar is a local-first strength-training ledger. It lets a lifter maintain a reusable, gym-agnostic catalog of movements and assemble routines with optional targets, without accounts, sync, or third-party tracking. Success means recording and configuring training structure accurately with minimal interruption.

## Positioning

Crowbar separates canonical movement identity from equipment-specific exercise use. Movements remain gym-agnostic and reusable, while routine sub-routines bind them to a gym and equipment context.

## Operating Context

The product is used on a personal device during routine planning and training. The routine builder is a focused working surface where the lifter adds ordered movements and configures working sets, reps, recording scale, and tempo.

## Capabilities and Constraints

- The catalog is hand-seeded and user-extensible; catalog updates only add entries.
- Movement names are required and unique under case- and spacing-insensitive comparison; near matches are suggested.
- Archived movements remain in history but are excluded from active pickers.
- A movement has one primary muscle group, a display unit, and instructions.
- Loads are stored canonically in pounds while movements display kilograms or pounds.
- Routine movements may have targets for working sets, reps, RIR/RPE, and tempo.
- The quick-create flow must preserve unfinished drafts and existing interruption/dirty-state behavior.
- Existing platform behavior supports iOS, Android, and static web, with platform-specific navigation.

## Brand Commitments

The product name is Crowbar. Its established design system is “The Strength Ledger”: a professional, dense, legible monochrome instrument using system typography, tonal surfaces, restrained radii, and one decisive action surface. Existing terminology and factual copy must remain intact unless explicitly changed.

## Evidence on Hand

- Product overview: `README.md`
- Domain model and terminology: `CONTEXT.md`
- Architectural constraints: `docs/adr/0002-single-device-no-sync.md`, `docs/adr/0003-hand-seeded-catalog.md`, `docs/adr/0004-canonical-lb-storage.md`
- Existing visual system: `DESIGN.md`
- Routine builder implementation: `src/features/routines/routines-screen.tsx`
- Existing movement picker/editor and target flow: `src/features/routines/movement-picker-modal.tsx`, `src/features/routines/movement-editor-modal.tsx`

## Product Principles

- Keep the lifter’s training intent visible and uninterrupted.
- Treat movement identity and training targets as distinct, accurate facts.
- Prefer local, explicit, reversible actions over hidden automation.
- Preserve history and drafts rather than discarding user work.
- Make dense training data scannable at a glance.
