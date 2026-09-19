import type { Config } from "drizzle-kit";

export default {
  schema: "./src/data/schema.ts",
  out: "./src/data/migrations",
  dialect: "sqlite",
  driver: "expo",
  strict: true,
} satisfies Config;
