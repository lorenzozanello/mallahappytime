import 'server-only';
import { getChunk, getChunksForExperience, getDevelopmentSummaries, getExperienceById, getLevel, getLevels } from '@/lib/curriculum';
import { SECTION_LABELS } from '@/lib/curriculum/sections';
import type { CurriculumChunk } from '@/lib/curriculum/types';
import { retrieveCurriculum, type RetrievalResult } from '@/lib/retrieval';
import type { HappyContext } from './context';
import { HAPPY_MODES } from './modes';
import type { SourceRef } from './schema';

const MAX_EVIDENCE = 16;

export interface Evidence {
  chunks: CurriculumChunk[];
  retrieval: RetrievalResult;
}

/**
 * Curriculum Retrieval for Happy: the current experience's core sections (by mode)
 * plus hybrid-search hits for the teacher's words. Never the whole curriculum.
 */
export async function gatherEvidence(ctx: HappyContext): Promise<Evidence> {
  const query = [ctx.message, ctx.selectedOption?.title, ctx.selectedOption?.description].filter(Boolean).join('. ');
  const retrieval = await retrieveCurriculum({
    query,
    context: { levelId: ctx.level?.id, period: (ctx.period ?? undefined) as 1 | 2 | 3 | 4 | undefined, experienceId: ctx.experience?.id },
    limit: 10,
    perExperienceCap: 2,
  });

  const selected = new Map<string, CurriculumChunk>();
  const add = (c: CurriculumChunk | undefined) => {
    if (c && selected.size < MAX_EVIDENCE) selected.set(c.id, c);
  };

  if (ctx.experience) {
    const expChunks = getChunksForExperience(ctx.experience.id);
    const sections = [...HAPPY_MODES[ctx.mode].coreSections];
    if (ctx.stage === 'desarrollo') sections.push('indicadores', 'dua', 'familia', 'observacion');
    for (const s of sections) add(expChunks.find((c) => c.section === s));
  }
  // Selected path sources come first among the retrieved material.
  for (const id of ctx.selectedOption?.sourceIds ?? []) add(getChunk(id));
  for (const hit of retrieval.hits) add(hit.chunk);

  // Progression questions: include the development summaries around the current level.
  if (retrieval.concepts.some((c) => c.key === 'progresion') && ctx.level) {
    const levels = getLevels();
    const i = levels.findIndex((l) => l.id === ctx.level!.id);
    for (const l of [levels[i - 1], levels[i]].filter(Boolean)) {
      for (const d of getDevelopmentSummaries(l!.id)) add(getChunk(d.id));
    }
  }
  return { chunks: [...selected.values()], retrieval };
}

export function toSourceRef(chunk: CurriculumChunk): SourceRef {
  const exp = chunk.experienceId ? getExperienceById(chunk.experienceId) : undefined;
  const level = chunk.levelId ? getLevel(chunk.levelId) : undefined;
  const sectionLabel = chunk.section === 'progresion' ? `Progresión · ${chunk.subsection}` : chunk.subsection && chunk.section === 'propositos' ? `${SECTION_LABELS[chunk.section]} · ${chunk.subsection}` : SECTION_LABELS[chunk.section];
  return {
    sourceId: chunk.id,
    sectionLabel,
    experienceTitle: exp?.title ?? null,
    levelPeriod: level ? (exp ? `${level.name} · ${exp.periodLabel}` : level.name) : null,
    href: exp ? `/malla/${exp.levelId}/${exp.period}?vista=completa#${chunk.section}` : chunk.section === 'progresion' ? '/progresion' : chunk.section === 'principio' ? '/institucional' : null,
    excerpt: chunk.content.length > 240 ? `${chunk.content.slice(0, 237).trimEnd()}…` : chunk.content,
  };
}

/** Evidence block given to the model. Content is delimited and declared as data. */
export function formatEvidence(chunks: CurriculumChunk[]): string {
  return chunks
    .map((c) => {
      const ref = toSourceRef(c);
      const where = [ref.levelPeriod, ref.experienceTitle ? `«${ref.experienceTitle}»` : null, ref.sectionLabel].filter(Boolean).join(' · ');
      return `[${c.id}] ${where}\n${c.content}`;
    })
    .join('\n\n');
}
