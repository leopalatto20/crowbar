# Lookup Table Seeding

## Question

How should this Expo SQLite application create the initial rows for
`effort_metrics` and `load_representations` without manually editing generated
Drizzle migration files? Does SQLite `STRICT` mode change the answer?

## Scope

The repository currently uses:

- `drizzle-orm` `^0.45.2`
- `drizzle-kit` `0.31.10`
- `expo-sqlite` `~57.0.3`
- SQLite dialect with the Expo driver in `drizzle.config.ts`

The two tables currently contain only a required text primary key:

- [`src/data/schema/effort-metrics.ts`](../../src/data/schema/effort-metrics.ts)
- [`src/data/schema/load-representations.ts`](../../src/data/schema/load-representations.ts)

The generated initial migration creates both tables but contains no seed rows:

- [`src/data/migrations/0000_initial-schema.sql`](../../src/data/migrations/0000_initial-schema.sql)

The accepted domain values are established by the repository context and ADRs:

- [`CONTEXT.md`](../../CONTEXT.md)
- [`docs/adr/0003-machine-load-representation.md`](../adr/0003-machine-load-representation.md)
- [`docs/adr/0006-one-effort-metric.md`](../adr/0006-one-effort-metric.md)

## Findings

### Drizzle Kit custom migrations support seed SQL

The official Drizzle custom-migrations guide explicitly supports generating an
empty migration for data seeding:

```sh
drizzle-kit generate --custom --name=seed-users
```

The guide then shows manually adding `INSERT` statements to the generated SQL
file. This is a supported Drizzle workflow, but it directly conflicts with the
constraint not to manually edit generated migration files.

Sources:

- [Drizzle custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations)
- [Drizzle Kit 0.31.10 CLI source](https://github.com/drizzle-team/drizzle-orm/blob/drizzle-kit%400.31.10/drizzle-kit/src/cli/schema.ts#L42-L56), where `--custom` is described as preparing an empty migration file for custom SQL

### Drizzle ORM supports the required runtime insert operations

Drizzle ORM supports inserting one or multiple rows with `.values(...)`. It
also supports `.onConflictDoNothing()`, which is suitable for these lookup
tables because `code` is their primary key.

Illustrative shape:

```ts
await db
  .insert(effortMetrics)
  .values([{ code: "rpe" }, { code: "rir" }])
  .onConflictDoNothing();

await db
  .insert(loadRepresentations)
  .values([{ code: "kilograms" }, { code: "pounds" }, { code: "plate_count" }])
  .onConflictDoNothing();
```

The values are parameterized by Drizzle rather than interpolated into SQL.

Sources:

- [Drizzle insert](https://orm.drizzle.team/docs/insert)
- [Drizzle ORM 0.45.2 SQLite insert builder](https://github.com/drizzle-team/drizzle-orm/blob/0.45.2/drizzle-orm/src/sqlite-core/query-builders/insert.ts)

### Expo SQLite provides an appropriate initialization seam

Expo SDK 57 documents `SQLiteProvider` with an `onInit` callback. Its example
performs database setup and inserts during initialization. Expo SQLite also
provides `withTransactionAsync` and `withExclusiveTransactionAsync` for
grouping writes and rolling them back on failure.

The database is persisted across application restarts, so an initialization
bootstrap will run against an existing database as well as a new one. The
bootstrap therefore must be idempotent.

Sources:

- [Expo SQLite SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Expo SQLite SDK 57 source](https://github.com/expo/expo/tree/sdk-57/packages/expo-sqlite)
- [Drizzle ORM 0.45.2 Expo migrator](https://github.com/drizzle-team/drizzle-orm/blob/0.45.2/drizzle-orm/src/expo-sqlite/migrator.ts), which applies the bundled Drizzle migration SQL and journal entries

### SQLite supports idempotent inserts and transactions

SQLite supports multiple-row `INSERT` statements and conflict resolution such
as `INSERT OR IGNORE`. Its UPSERT syntax also supports `ON CONFLICT ... DO
NOTHING`. Since both tables have a primary-key uniqueness constraint, a repeat
bootstrap can safely leave existing rows unchanged.

SQLite transactions provide the desired all-or-nothing behavior. A transaction
should cover both lookup tables so a failure does not leave only half of the
required seed set installed.

Sources:

- [SQLite INSERT](https://www.sqlite.org/lang_insert.html)
- [SQLite UPSERT](https://www.sqlite.org/lang_upsert.html)
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html)

### `strict: true` in this repository is not SQLite STRICT-table mode

The repository's `drizzle.config.ts` uses `strict: true`. In Drizzle Kit
0.31.10, that option belongs to the `push` command and means "Always ask for
confirmation." It does not append SQLite's `STRICT` table option to generated
`CREATE TABLE` statements.

SQLite `STRICT` is a table-level SQL option written at the end of a
`CREATE TABLE` statement. It changes type enforcement for inserted values and
requires declared SQLite datatypes. It does not provide seed-row behavior,
automatic default rows, or a migration mechanism.

The existing tables use `TEXT PRIMARY KEY`, and the seed values are text, so
SQLite STRICT mode would not change the seeding design even if the tables were
made strict. It would also introduce a compatibility requirement: SQLite only
recognizes the `STRICT` table option starting with SQLite 3.37.0.

Sources:

- [Drizzle Kit 0.31.10 CLI source](https://github.com/drizzle-team/drizzle-orm/blob/drizzle-kit%400.31.10/drizzle-kit/src/cli/schema.ts#L201-L223), where `push --strict` is defined as confirmation behavior
- [SQLite STRICT tables](https://www.sqlite.org/stricttables.html)
- [SQLite CREATE TABLE](https://www.sqlite.org/lang_createtable.html)

## Options

| Option                                               | Supported                           | Meets the constraint | Assessment                                                                                                 |
| ---------------------------------------------------- | ----------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Add rows to a normal generated migration             | Yes                                 | No                   | Direct and migration-ordered, but requires manually editing generated SQL.                                 |
| Generate a Drizzle custom migration and add seed SQL | Yes                                 | No                   | Officially supported, but the documented process still requires manual SQL editing.                        |
| Put seed rows in the Drizzle schema declaration      | No practical support for this shape | Yes                  | The schema describes table structure, not arbitrary initial rows; current generation emits no lookup data. |
| Bootstrap rows at runtime after migrations           | Yes                                 | Yes                  | Fits Expo's initialization API, avoids generated-file edits, and can be idempotent.                        |
| Ship a pre-populated SQLite database file            | Technically possible                | Yes                  | Adds binary asset/versioning and upgrade complexity without helping the current migration flow.            |

## Recommendation

Use a small runtime bootstrap that runs after the Drizzle migrations have
completed:

1. Run the existing Drizzle migration initialization.
2. In the same database initialization path, insert the accepted lookup rows.
3. Use Drizzle inserts with `.onConflictDoNothing()` or parameterized Expo
   SQLite statements with `INSERT OR IGNORE`.
4. Wrap both table writes in one transaction.

This is the only evaluated option that satisfies all stated constraints while
using the APIs supported by the installed Drizzle and Expo versions. It also
handles databases created before the seed bootstrap was added: rerunning the
bootstrap fills missing rows without duplicating existing primary-key values.

The bootstrap should be treated as application-owned data initialization, not
as generated schema output. If the canonical lookup set changes later, add an
explicit versioned data-initialization step rather than silently removing or
changing rows.

## Limitations and Open Decisions

- This report does not change the application initialization code.
- The exact application call site for `SQLiteProvider` or equivalent database
  startup is not present in the inspected data-layer files, so implementation
  should be placed at the existing app-level migration completion seam.
- Expo documents both non-exclusive and exclusive async transactions. If
  multiple initialization paths can write concurrently, prefer the exclusive
  transaction API and execute all writes through its transaction object.
- The report does not assert a specific SQLite amalgamation version bundled by
  Expo SDK 57. The relevant SQLite compatibility fact is the SQLite project's
  documented minimum version for `STRICT` table syntax.

## Primary Sources

- [Drizzle custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations)
- [Drizzle insert](https://orm.drizzle.team/docs/insert)
- [Drizzle Kit 0.31.10 CLI source](https://github.com/drizzle-team/drizzle-orm/blob/drizzle-kit%400.31.10/drizzle-kit/src/cli/schema.ts)
- [Drizzle ORM 0.45.2 Expo migrator](https://github.com/drizzle-team/drizzle-orm/blob/0.45.2/drizzle-orm/src/expo-sqlite/migrator.ts)
- [Expo SQLite SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Expo SQLite SDK 57 source](https://github.com/expo/expo/tree/sdk-57/packages/expo-sqlite)
- [SQLite INSERT](https://www.sqlite.org/lang_insert.html)
- [SQLite UPSERT](https://www.sqlite.org/lang_upsert.html)
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html)
- [SQLite STRICT tables](https://www.sqlite.org/stricttables.html)
- [SQLite CREATE TABLE](https://www.sqlite.org/lang_createtable.html)
