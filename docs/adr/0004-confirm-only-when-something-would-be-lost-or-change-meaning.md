# Confirm only when something would be lost or change meaning

Crowbar asks for confirmation before an action only when the action would lose something the lifter entered and can't get back in the app (logged sets, a Station's label or notes, a Routine's design), or would change what logged sets mean (a unit relabel, a merged history). It checks whether that is true at that moment and acts at once when it isn't, so deleting an empty Routine, a Gym never trained at, or a Station with no sets, label or notes takes one tap. Where a confirm does show, it is counted: it says how many sets, Workouts, Stations or Exercises go with the action, read when it opens. Small deletes repeated in a row, like trimming logged sets in edit mode, use an inline two-tap arm in the row instead of a modal (the trash turns into a red Delete, and a second tap deletes it), so getting through several doesn't mean several dialogs ("Arm before deleting a logged set in edit mode", #115). Decided in "Which destructive actions need a confirmation" (#108).

Not every prompt is a confirm. "Discard and start new" offers a choice between Resume and Discard, so it always shows. Removing a Routine slot takes a swipe and then a tap on Remove, and that counts as the confirmation.

## Considered Options

- **Always confirm destructive actions**: safe, but a dialog that shows when nothing is at stake teaches the lifter to tap through it, so it protects less on the deletes that matter.
- **Act at once and offer undo**: the fastest, but it needs a toast or snackbar to offer the undo, and ADR 0003 has no toast layer. It also needs every delete to be reversible, which the cascades through Stations, Workouts and sets make hard to get right.
- **Never confirm**: logged history is the reason the app exists, and losing it to a mistap can't be fixed.
