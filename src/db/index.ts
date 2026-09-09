/**
 * Crowbar persistence module — one typed schema, generated migrations applied at
 * startup, a thin repository, and the `getDb()` seam (ADR 0005). Consumers import
 * the whole surface from here: `import * as db from '@/db'`.
 */
export * as schema from './schema';
export * as constants from './constants';
export * from './get-db';
export * from './repository';
export * from './migrate';