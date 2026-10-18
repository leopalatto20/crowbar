---
name: verify-crowbar
description: Drive the Crowbar iOS app (Expo development build) on a dedicated simulator and capture proof - screenshots, accessibility trees, SQLite rows. Use when you need to show that a Crowbar feature or fix actually works on device, reproduce a UI bug, or check what a screen does, rather than trusting unit tests alone.
---

# Verify Crowbar

Crowbar is an iOS/Android Expo app with no server: every user action ends as rows in a local SQLite file. Verification means tapping through the real UI on an iOS simulator and checking both the screen and the database.

Everything goes through one helper, run from the repo root:

```sh
.agents/skills/verify-crowbar/scripts/crowbar-verify <command>
```

Run it with no arguments for the command list. Below, `cv` stands for that path.

## Isolation

The user's own setup is `bun run dev` (Metro on :8081) and the `iPhone 17 Pro` simulator. Never touch either. The helper owns:

- a simulator named `crowbar-verify` (created on first `up`), its keyboard pinned to US English with autocorrect, autocapitalization and predictions off, so `cv type` lands exactly what it was given
- Metro on **:8082** (override with `CROWBAR_VERIFY_PORT`), started by the helper, pid in its state dir
- state and evidence under `~/.cache/crowbar-verify/`

If :8082 is held by anything the helper didn't start, `up` refuses rather than sharing it.

The app runs as a **development build** (`com.anonymous.crowbar`), never in Expo Go: Expo Go ships its own pinned native modules, which differ from the project's. The build comes from `expo run:ios`, which writes the gitignored `apps/native/ios/` and Xcode DerivedData. Both are shared with the user's own `bun run ios`, which is harmless because they're regenerated output.

## Launch

```sh
cv up            # boot sim, start Metro on :8082, build if needed, install, launch
cv up --fresh    # same, but reinstall so the app starts with an empty database
cv up --rebuild  # force a native rebuild
cv launch        # kill and relaunch the app, keeping its data
```

- The first `up` builds the native app: several minutes, logged to `~/.cache/crowbar-verify/build.log`. Later runs reuse the cached `.app` until `apps/native/package.json`, `app.json` or `bun.lock` changes, then rebuild automatically.
- **Ready** means `up` printed `ready: crowbar-verify (...)`. It waits for the tab bar, which renders only after the database opens and settings load.
- Metro runs in watch mode, so JS edits hot-reload into the running app. Native changes (new native packages, `app.json` plugins) need `cv up` to pick up the rebuild.
- `expo run:ios` only runs prebuild when `apps/native/ios/` is missing, so a new config plugin (one that adds Info.plist keys or a target) never reaches an existing `ios/`. Run `bunx expo prebuild -p ios` in `apps/native` first, then `cv up --rebuild`.

## Doctor

Run `cv doctor` first, and again whenever anything looks off. It's read-only and exits 1 if the instance isn't worth driving. It checks:

- the sim is booted
- Metro is ours and answering on :8082
- the build matches the native dependencies
- the app is installed and loads JS from `localhost:8082`
- the database exists
- the keyboard is pinned (a sim created before pinning existed fails here until the next `up`)
- the Metro log has no `ERROR` lines

A WARN about ERROR lines means read `cv logs` before trusting anything on screen.

## Drive

The harness is [AXe](https://github.com/cameroncooke/AXe), via the helper. Everything targets accessibility labels, never coordinates.

```sh
cv tree                                   # type, label, value, frame for every labelled element
cv tap "Start empty Workout" --element-type Button
cv tap Exercises --element-type RadioButton   # tabs are RadioButtons; value 1 = selected
cv tap --value "Routine name" --element-type TextField   # empty fields: placeholder is AXValue
cv type "Push Day"                        # paced typing into the focused field
cv erase 8                                # backspace
cv wait "Every set is logged." 10         # block until a label appears (labels only, never a placeholder)
```

- Labels are the English UI strings in `apps/native/lib/i18n/en.ts`. The simulator runs in English, so read the catalog for the exact text.
- Always run `cv tree` after an action before assuming what's on screen. The tree also lists elements _behind_ a sheet or menu, so a label being present does not prove it's on top. The `shot` screenshot is the arbiter.
- `tap` waits up to 10s for its target. Pass `--element-type` whenever a label exists twice (`Workout` is both a tab and a back button).
- The software keyboard never shows. The headless sim behaves as if a hardware keyboard is attached, so the keyboard stays below the screen even after tapping a field. Its keys still appear in `cv tree` (at y beyond the screen height), so their presence proves nothing. To prove a field has focus, show its blinking cursor in a `shot` and `cv type` into it without tapping first. To check layout against the keyboard, the user has to show the `crowbar-verify` sim in Simulator.app and press ⌘K: after that, focusing a field brings the keyboard up on screen. `cv type` sends hardware key events, which hide it again, so type by tapping its keys by frame instead.
- Native SwiftUI menus (`PopUpButton`, such as Equipment type) open as a list of `Button`s. Tap the option by its label.
- A red-box **Render Error** replaces the screen when JS throws. `cv tree` shows its message as StaticText, and `cv logs` has the stack. Treat it as a finding, not a harness problem.
- Text-style buttons inside form rows ("Use it", "Unhide" in New Exercise) respond only on their text, but `tap` aims at the centre of the full-width row and does nothing. Tap the text by frame: `cv tap --pre-delay 0 -x <left edge + 40> -y <row centre>`.
- Long-press and swipe have no `cv` command. Use AXe directly with the UDID from `cv doctor`: `axe touch -x <x> -y <y> --down --up --delay 1.0 --udid <udid>` for a long-press, `axe swipe --start-x 330 --start-y <y> --end-x 120 --end-y <y> --duration 0.3 --udid <udid>` to swipe a row left.
- Killing the app mid-flow (`cv launch`) is the real way to test resume-after-kill.

## Evidence

```sh
cv run <name>          # starts ~/.cache/crowbar-verify/evidence/<timestamp>-<name>/, prints it
cv shot <step-name>    # <step>.png + <step>.tree.txt into the current run
cv save-db "<sql>"     # query result appended to the run's db.txt
cv db "<sql>"          # ad-hoc query, not saved
```

`db` queries a copy of the app's `crowbar.db` (taken with its `-wal`), so it never locks or alters the app's file. Tables: `gym`, `workout`, `workout_exercise`, `set`, `station`, `routine`, `routine_exercise`, `exercise`, `settings` (see `apps/native/db/schema.ts`).

Proof standards:

- Drive the real user path: taps and typing through the UI. Never seed the database or call `db/*` functions to reach a state. If the UI can't reach it, that's the finding.
- Capture the action and its result: a `shot` before the decisive tap and one after, not just the final screen.
- Verify the side effect: every feature writes SQLite, so pair the screenshot with a `save-db` query showing the row. Take a baseline `save-db` before acting when counts matter.
- Use `cv up --fresh` when the proof depends on first-run state (no Gym yet, no Custom Exercises).
- No mocks are needed: the app has no network dependency.

## Cleanup

```sh
cv down      # stop the Metro this tool started (by pid), shut down crowbar-verify
cv destroy   # down, then delete the crowbar-verify sim and the cached build
```

Neither deletes `~/.cache/crowbar-verify/evidence/`. Proof survives teardown; delete old runs by hand when no longer needed. Neither kills by process name. If `down` reports no pid but :8082 is still held, find the owner with `lsof -nP -iTCP:8082 -sTCP:LISTEN` and only kill it if its command line is this repo's `expo start --port 8082`.

## Feature map

`features/README.md` indexes the user-facing features, each with how to reach it, how to drive it, and what end state proves it. Verifying a feature means covering the sub-features its file lists, not one convenient entry point. When the app changes, update the map in the same change.
