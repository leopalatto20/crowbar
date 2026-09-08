# Crowbar

Local-first, single-lifter workout tracking for advanced lifters —
movement identity (canonical lifts, muscle groups) and measurement
(sets, volume, strength). Runs on Android, iOS, and the web with a
single on-device SQLite store (`expo-sqlite` + Drizzle).

## Run

```bash
npm install
npm start        # Expo dev server
npm run web      # web build
```

## Tests

The domain is spec-tested against real SQLite through the `getDb()` seam — tests
never touch the on-device database (ticket #3).

```bash
npm test        # one-shot
npm run test:watch
```

`jest-expo` provides the runner and preset; `better-sqlite3` is the dev-only
test driver over the same schema and migrations the app uses (see `db/get-db.ts`
and `test/helpers/`).