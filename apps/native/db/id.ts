import { sql } from "drizzle-orm";

import type { Database } from "./database";

// UUIDv7: time-ordered, so rows sort by creation in the index. The random bits come from
// SQLite because Hermes has no crypto, and hex() reads back as the same string on both drivers.
export function newId(db: Database) {
  const [{ random }] = db.all<{ random: string }>(sql`select lower(hex(randomblob(10))) as random`);
  const time = Date.now().toString(16).padStart(12, "0");
  const variant = ((parseInt(random.slice(3, 4), 16) & 0x3) | 0x8).toString(16);
  return [
    time.slice(0, 8),
    time.slice(8, 12),
    `7${random.slice(0, 3)}`,
    `${variant}${random.slice(4, 7)}`,
    random.slice(7, 19),
  ].join("-");
}
