import { bootstrapLookupTables } from "./lookup-bootstrap";
import { effortMetrics } from "./schema/effort-metrics";
import { loadRepresentations } from "./schema/load-representations";

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
    expect(inserted).toEqual([
      {
        table: effortMetrics,
        values: [{ code: "rpe" }, { code: "rir" }],
      },
      {
        table: loadRepresentations,
        values: [
          { code: "kilograms" },
          { code: "pounds" },
          { code: "plate_count" },
        ],
      },
      {
        table: effortMetrics,
        values: [{ code: "rpe" }, { code: "rir" }],
      },
      {
        table: loadRepresentations,
        values: [
          { code: "kilograms" },
          { code: "pounds" },
          { code: "plate_count" },
        ],
      },
    ]);
    expect(conflictHandlingCalls).toBe(4);
    expect(runCalls).toBe(4);
  });

  it("propagates a failed write so the transaction can roll back", () => {
    let runCalls = 0;
    let transactionRolledBack = false;

    const insert = () => {
      const builder = {
        values() {
          return builder;
        },
        onConflictDoNothing() {
          return builder;
        },
        run() {
          runCalls += 1;
          if (runCalls === 2) {
            throw new Error("load representation seed failed");
          }
        },
      };

      return builder;
    };

    const database = {
      transaction(callback: (transaction: { insert: typeof insert }) => void) {
        try {
          callback({ insert });
        } catch (error) {
          transactionRolledBack = true;
          throw error;
        }
      },
    } as unknown as Parameters<typeof bootstrapLookupTables>[0];

    expect(() => bootstrapLookupTables(database)).toThrow(
      "load representation seed failed",
    );
    expect(transactionRolledBack).toBe(true);
    expect(runCalls).toBe(2);
  });
});
