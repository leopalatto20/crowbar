# Drizzle ORM with the Expo SQLite driver

Persistence is Drizzle ORM 0.45.x using its built-in `drizzle-orm/expo-sqlite` driver — the only ORM that can run on-device in React Native. `drizzle-kit` generates migrations (`dialect: sqlite, driver: expo`), bundled into the app via `babel-plugin-inline-import` and applied at startup with `useMigrations`. The schema lives in a single `src/db/schema.ts`; a `getDb()` seam returns the expo driver in the app and better-sqlite3 (dev-only) in tests, so one schema serves both.

Every other ORM is Node-native (better-sqlite3, knex, Prisma, TypeORM) and cannot load under Hermes; raw expo-sqlite SQL was viable but forfeits typed schema, migrations, and relations. Drizzle maintains the expo-sqlite driver in-core (peer-dep expo-sqlite >=14; ours is 57.0.2, and the `openDatabaseSync` symbol it uses is confirmed present in the installed package).

**Consequences**: SQL migrations ship inside the app binary and run on first launch; ORM upgrades are coupled to the driver's support; repository tests run on real SQLite through the seam, not mocks.