# Shared Routines match Exercises by meaning, not by id

A Shared Routine carries only a Routine's name and, per slot, its Exercise and Targets: nothing of the sharer's Gyms, Stations, loads or history. A Built-in Exercise is referenced by its Crowbar-owned slug alone, and a slug the importing app doesn't know rejects the whole file with "Update Crowbar to open this Routine". A Custom Exercise's id means nothing on another device, so the file carries its definition (name, Equipment type, Load type, Unilateral, Muscle group), and the importer reuses the existing Exercise whose name matches (in either language, ignoring case and accents) with the same Load type and Unilateral, since those two decide how logged load and reps are read. Equipment type and Muscle group don't take part. With no match, a new Custom Exercise is created, its name suffixed when it would collide. Importing never changes an existing Exercise, so a matched Hidden Exercise stays hidden, and it always adds a new Routine rather than merging into one. A preview lists which Custom Exercises will be created and which reused before anything is written, and the import runs in one transaction.

## Considered Options

- **Always create new Custom Exercises**: simple, but every re-import or round trip between two lifters piles up duplicates and breaks unique names.
- **Match by name alone**: reuses "Dips" (Bodyweight) for a file's "Dips" (Assisted), so logged load would be read with the wrong sign.
- **Ask the lifter to map each Custom Exercise on import**: precise, but slow for the common case, and a wrong reuse is already fixed with a Swap.
- **Fall back to a Custom Exercise for an unknown built-in slug**: lets an older app open the file, but once the app updates and seeds the real Built-in Exercise there are two Exercises with one name and the history is split between them.
