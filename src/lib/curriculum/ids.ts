/** Client-safe helpers for canonical curriculum IDs (no corpus access). */
const LEVEL_BY_CODE: Record<string, string> = { S1: 'step-1', S2: 'step-2', S3: 'step-3', K: 'kinder', T: 'transicion' };

export function hrefForSourceId(id: string): string | null {
  if (id.startsWith('HT-INST-')) return '/institucional';
  const m = /^HT-(S1|S2|S3|K|T)-(?:P([1-4])|DIM|PERFIL)/.exec(id);
  if (!m) return null;
  const level = LEVEL_BY_CODE[m[1]!]!;
  if (m[2]) return `/malla/${level}/${m[2]}?vista=completa`;
  return id.includes('-DIM-') ? `/progresion?nivel=${level}` : `/malla/${level}`;
}
