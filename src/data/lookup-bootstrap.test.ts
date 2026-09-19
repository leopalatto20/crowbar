import { bootstrapLookupTables } from "./lookup-bootstrap";

describe("bootstrapLookupTables", () => {
  it("seeds both lookup tables transactionally and safely on repeat runs", () => {
    const inserted: { table: unknown; values: unknown }[] = [];
    let conflictHandlingCalls = 0;
    let runCalls = 0;
    let transactionCalls = 0;

    const insert = (table: unknown) => {
      const builder = {
        values(values: unknown) {
          inserted.push({ table, values });
          return builder;
        },
        onConflictDoNothing() {
          conflictHandlingCalls += 1;
          return builder;
        },
        run() {
          runCalls += 1;
        },
      };

      return builder;
    };

    const database = {
      transaction(callback: (transaction: { insert: typeof insert }) => void) {
        transactionCalls += 1;
        callback({ insert });
      },
    } as unknown as Parameters<typeof bootstrapLookupTables>[0];

    bootstrapLookupTables(database);
    bootstrapLookupTables(database);

    expect(transactionCalls).toBe(2);
    expect(inserted).toHaveLength(4);
    expect(conflictHandlingCalls).toBe(4);
    expect(runCalls).toBe(4);
  });
});
