import 'server-only';
import corpusJson from './generated/corpus.json';
import type {
  CurriculumChunk,
  CurriculumCorpus,
  CurriculumExperience,
  CurriculumLevel,
  LevelId,
  PeriodNumber,
} from './types';

/**
 * The single runtime entry point to the institutional curriculum.
 * Data comes exclusively from the generated corpus (see scripts/import-curriculum.ts).
 */
export const corpus = corpusJson as unknown as CurriculumCorpus;

const chunkById = new Map(corpus.chunks.map((c) => [c.id, c]));
const experienceById = new Map(corpus.experiences.map((e) => [e.id, e]));

export function getLevels(): CurriculumLevel[] {
  return [...corpus.levels].sort((a, b) => a.order - b.order);
}

export function getLevel(id: string): CurriculumLevel | undefined {
  return corpus.levels.find((l) => l.id === id);
}

export function isLevelId(id: string): id is LevelId {
  return corpus.levels.some((l) => l.id === id);
}

export function isPeriod(n: number): n is PeriodNumber {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export function getExperiencesForLevel(levelId: string): CurriculumExperience[] {
  return corpus.experiences.filter((e) => e.levelId === levelId).sort((a, b) => a.period - b.period);
}

export function getExperience(levelId: string, period: number): CurriculumExperience | undefined {
  return corpus.experiences.find((e) => e.levelId === levelId && e.period === period);
}

export function getExperienceById(id: string): CurriculumExperience | undefined {
  return experienceById.get(id);
}

export function getChunk(id: string): CurriculumChunk | undefined {
  return chunkById.get(id);
}

export function getChunksForExperience(experienceId: string): CurriculumChunk[] {
  return corpus.chunks.filter((c) => c.experienceId === experienceId);
}

export function getAllChunks(): readonly CurriculumChunk[] {
  return corpus.chunks;
}

export function getDevelopmentSummaries(levelId?: string) {
  return levelId ? corpus.developmentSummaries.filter((d) => d.levelId === levelId) : corpus.developmentSummaries;
}

export function getPrinciples() {
  return corpus.principles;
}

/** URL helpers keep routing concerns out of components. */
export function experienceHref(e: Pick<CurriculumExperience, 'levelId' | 'period'>, view?: 'completa'): string {
  return `/malla/${e.levelId}/${e.period}${view ? `?vista=${view}` : ''}`;
}

export function experienceLabel(e: CurriculumExperience): string {
  const level = getLevel(e.levelId);
  return `${level?.name ?? e.levelId} · ${e.periodLabel}`;
}
