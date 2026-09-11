export function normalizeErrorMessage(error: unknown, fallback: string): string {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  const normalized = message.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}
