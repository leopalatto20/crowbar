import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loadRepresentations = sqliteTable("load_representations", {
  code: text("code").primaryKey(),
});

export type LoadRepresentation = typeof loadRepresentations.$inferSelect;
