# Row actions live in the long-press menu

On the Routine, Gym and Exercise lists, a tap does the row's main action (start a Workout, rename a Gym, open an Exercise), and a long press opens a menu holding every other action. The rows have no swipe actions. Each swipe only repeated one menu item (Edit a Routine, Delete or Rename a Gym, Hide an Exercise), and Android, with no swipe actions in Compose, only ever had the menu. One gesture per list on both platforms is easier to learn than two that overlap. Destructive actions also stay behind the menu, so a swipe meant for scrolling can't start a Delete. Decided in "Move every list row action into the long-press menu" (#137).

The exception is a slot in the Routine editor. Its swipe reveals Remove, and that swipe followed by a tap is the confirmation ADR 0004 counts on, so the menu doesn't hold Remove.

## Considered Options

- **Keep the swipe for quick, repeatable actions (Delete, Hide) and drop it only for navigation (Edit)**: closer to the iOS habit and faster when hiding several Exercises in a row, but it keeps two overlapping gestures on iOS and a different set on Android.
- **Keep every swipe**: the most familiar on iOS, but every action is in two places, and the Routine swipe to Edit is navigation, which iOS doesn't usually put on a swipe.
