import 'server-only';

/**
 * Small in-memory sliding-window limiter to protect the AI endpoint from runaway
 * loops. Per instance only (serverless instances do not share it); it is a guard,
 * not a quota system.
 */
const hits = new Map<string, number[]>();

export function allowRequest(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
