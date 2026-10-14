import { desc, eq } from "drizzle-orm";

import type { Database } from "./database";
import { newId } from "./id";
import { gym, workout } from "./schema";

export function createGym(db: Database, name: string) {
  const id = newId(db);
  db.insert(gym).values({ id, name: name.trim() }).run();
  return id;
}

// Derived rather than stored, so it can never point at a deleted Gym: the Gym of the latest
// Workout, else the newest Gym (ids are time-ordered), which covers a first Workout discarded.
export function lastUsedGym(db: Database): typeof gym.$inferSelect | undefined {
  return (
    db
      .select({ id: gym.id, name: gym.name })
      .from(workout)
      .innerJoin(gym, eq(gym.id, workout.gymId))
      .orderBy(desc(workout.startedAt))
      .limit(1)
      .get() ?? db.select().from(gym).orderBy(desc(gym.id)).limit(1).get()
  );
}
