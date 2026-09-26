import type { HappyEventInput, HappyStats } from './types';

export function computeHappyStats(
  events: (HappyEventInput & { id: string; createdAt: string })[],
  feedback: { rating: 'useful' | 'not_useful' }[],
  now = Date.now(),
): HappyStats {
  const byMode: Record<string, number> = {};
  const byValidation: Record<string, number> = {};
  let latencySum = 0;
  let latencyCount = 0;
  for (const e of events) {
    byMode[e.mode] = (byMode[e.mode] ?? 0) + 1;
    byValidation[e.validationStatus] = (byValidation[e.validationStatus] ?? 0) + 1;
    if (typeof e.latencyMs === 'number') {
      latencySum += e.latencyMs;
      latencyCount++;
    }
  }
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  return {
    total: events.length,
    last7Days: events.filter((e) => Date.parse(e.createdAt) >= weekAgo).length,
    byMode,
    byValidation,
    avgLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : null,
    feedback: {
      useful: feedback.filter((f) => f.rating === 'useful').length,
      notUseful: feedback.filter((f) => f.rating === 'not_useful').length,
    },
    recent: [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20),
  };
}
