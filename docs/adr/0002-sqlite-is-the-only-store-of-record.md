# SQLite is the only store of record

Every piece of persistent state, including the in-progress Workout and settings, lives in SQLite tables, written through as the lifter logs: each field commits when it is confirmed, and every visible set is a row with a `done` flag, so a killed app resumes exactly where it was. Screens read through react-query used as a local cache (`networkMode: 'always'`), where every query declares the tables it reads and a single bridge from expo-sqlite's change listener invalidates queries by table. zustand holds only ephemeral, cross-screen UI state and persists nothing.

## Considered Options

- **In-progress Workout in a persisted zustand store, committed to tables on finish**: two sources of truth during every Workout, a second migration story for the persisted shape, and the whole slice re-serialized on every update.
- **Drizzle `useLiveQuery` for reactivity**: it subscribes only to the query's root table, so a Workout joined with its sets goes stale when a set changes, and it re-runs every mounted query on every write with no shared cache or loading state.
- **Explicit invalidation after each write**: correct only as long as every write remembers every affected query; the table-level bridge makes forgetting impossible.
