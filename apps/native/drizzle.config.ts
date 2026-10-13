import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  // Emits migrations.js, which bundles the SQL files into the app through Metro.
  driver: "expo",
  schema: "./db/schema.ts",
  out: "./db/migrations",
});
