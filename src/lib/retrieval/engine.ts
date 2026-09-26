/**
 * Hybrid curriculum retrieval shared by Malla search and Happy.
 *
 *   metadata filters → lexical BM25 (+ teacher-vocabulary expansion)
 *   → section/context boosts → optional semantic leg (pgvector + Postgres FTS)
 *   → reciprocal-rank fusion → per-experience diversity cap
 *
 * Search and Happy use the same corpus and the same engine; only options differ.
 */
import { SECTION_LABELS, type SectionKey } from '@/lib/curriculum/sections';
import type { CurriculumChunk, LevelId, PeriodNumber } from '@/lib/curriculum/types';
import { detectConcepts, type ConceptMatch } from './concepts';
import { stem, tokenize } from './tokenize';

export interface RetrievalContext {
  levelId?: LevelId;
  period?: PeriodNumber;
  experienceId?: string;
}

export interface RetrievalFilters {
  levelId?: LevelId;
  period?: PeriodNumber;
  experienceId?: string;
  sections?: SectionKey[];
}

export interface RetrievalOptions {
  query: string;
  context?: RetrievalContext;
  filters?: RetrievalFilters;
  limit?: number;
  /** Max hits per experience in the final list (diversity). */
  perExperienceCap?: number;
}

export interface Excerpt {
  text: string;
  highlights: [number, number][];
  truncatedStart: boolean;
  truncatedEnd: boolean;
}

export interface RetrievalHit {
  chunk: CurriculumChunk;
  score: number;
  excerpt: Excerpt;
  matchedTerms: string[];
}

export type SemanticStatus = 'used' | 'not_configured' | 'error';

export interface RetrievalResult {
  query: string;
  hits: RetrievalHit[];
  concepts: { key: string; label: string }[];
  semantic: SemanticStatus;
}

/** Candidates from the database leg (vector similarity and/or Postgres FTS rank). */
export interface SemanticCandidate {
  id: string;
  similarity: number;
  ftsRank: number;
}

export type SemanticProvider = (
  query: string,
  filters: RetrievalFilters & RetrievalContext,
) => Promise<SemanticCandidate[] | 'not_configured'>;

interface IndexedDoc {
  chunk: CurriculumChunk;
  tf: Map<string, number>;
  length: number;
}

const K1 = 1.2;
const B = 0.6;
const RRF_K = 60;

export class RetrievalIndex {
  private docs: IndexedDoc[];
  private df = new Map<string, number>();
  private avgLength: number;

  constructor(
    chunks: readonly CurriculumChunk[],
    private experienceTitles: Map<string, string>,
  ) {
    this.docs = chunks
      .filter((c) => c.status === 'active')
      .map((chunk) => {
        const title = chunk.experienceId ? (experienceTitles.get(chunk.experienceId) ?? '') : '';
        const terms = [
          ...tokenize(chunk.content).map(stem),
          ...tokenize(chunk.tags.join(' ')).map(stem),
          ...tokenize(`${SECTION_LABELS[chunk.section]} ${chunk.subsection ?? ''} ${title}`).map(stem),
        ];
        const tf = new Map<string, number>();
        for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
        for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
        return { chunk, tf, length: terms.length };
      });
    this.avgLength = this.docs.reduce((n, d) => n + d.length, 0) / Math.max(1, this.docs.length);
  }

  private idf(term: string): number {
    const df = this.df.get(term) ?? 0;
    return Math.log(1 + (this.docs.length - df + 0.5) / (df + 0.5));
  }

  private bm25(doc: IndexedDoc, term: string): number {
    const tf = doc.tf.get(term) ?? 0;
    if (!tf) return 0;
    return (this.idf(term) * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / this.avgLength));
  }

  async search(opts: RetrievalOptions, semantic?: SemanticProvider): Promise<RetrievalResult> {
    const { query, context = {}, filters = {}, limit = 12, perExperienceCap = 3 } = opts;
    const concepts = detectConcepts(query);
    const queryStems = [...new Set(tokenize(query).map(stem))];
    const expansion = new Map<string, number>();
    for (const m of concepts) {
      for (const t of m.concept.expand.flatMap((e) => tokenize(e).map(stem))) {
        if (!queryStems.includes(t)) expansion.set(t, 0.35);
      }
    }
    const boostedSections = new Set(concepts.flatMap((m: ConceptMatch) => m.concept.sections));

    const candidates = this.docs.filter(({ chunk: c }) => {
      if (filters.levelId && c.levelId !== filters.levelId && c.levelId !== null) return false;
      if (filters.period && c.period !== filters.period && c.period !== null) return false;
      if (filters.experienceId && c.experienceId !== filters.experienceId) return false;
      if (filters.sections && !filters.sections.includes(c.section)) return false;
      return true;
    });

    const lexical: { doc: IndexedDoc; score: number; matched: string[] }[] = [];
    for (const doc of candidates) {
      let score = 0;
      const matched: string[] = [];
      for (const t of queryStems) {
        const s = this.bm25(doc, t);
        if (s > 0) {
          score += s;
          matched.push(t);
        }
      }
      for (const [t, w] of expansion) {
        const s = this.bm25(doc, t);
        if (s > 0) {
          score += w * s;
          matched.push(t);
        }
      }
      const coverage = queryStems.length ? matched.filter((t) => queryStems.includes(t)).length / queryStems.length : 0;
      const sectionMatch = boostedSections.has(doc.chunk.section);
      if (score === 0 && !sectionMatch) continue;
      score = score * (0.6 + coverage);
      if (sectionMatch) score = score * 1.8 + 1.5;
      score *= contextBoost(doc.chunk, context);
      lexical.push({ doc, score, matched });
    }
    lexical.sort((a, b) => b.score - a.score);

    // Semantic / database leg (optional). Failures are reported, never hidden.
    let semanticStatus: SemanticStatus = 'not_configured';
    let fused = lexical.map((l) => ({ ...l, fusedScore: l.score }));
    if (semantic && query.trim()) {
      try {
        const res = await semantic(query, { ...context, ...filters });
        if (res !== 'not_configured') {
          semanticStatus = 'used';
          fused = fuse(lexical, res, candidates, context);
        }
      } catch {
        semanticStatus = 'error';
      }
    }

    const hits: RetrievalHit[] = [];
    const perExp = new Map<string, number>();
    const allTerms = [...queryStems, ...expansion.keys()];
    for (const r of fused) {
      const expKey = r.doc.chunk.experienceId ?? r.doc.chunk.id;
      const n = perExp.get(expKey) ?? 0;
      if (n >= perExperienceCap) continue;
      perExp.set(expKey, n + 1);
      hits.push({ chunk: r.doc.chunk, score: r.fusedScore, excerpt: buildExcerpt(r.doc.chunk.content, allTerms), matchedTerms: r.matched });
      if (hits.length >= limit) break;
    }

    return {
      query,
      hits,
      concepts: concepts.map((m) => ({ key: m.concept.key, label: m.concept.label })),
      semantic: semanticStatus,
    };
  }
}

function contextBoost(c: CurriculumChunk, ctx: RetrievalContext): number {
  if (ctx.experienceId && c.experienceId === ctx.experienceId) return 1.6;
  let boost = 1;
  if (ctx.levelId && c.levelId === ctx.levelId) boost *= 1.2;
  if (ctx.levelId && c.levelId === ctx.levelId && ctx.period && c.period === ctx.period) boost *= 1.2;
  return boost;
}

function fuse(
  lexical: { doc: IndexedDoc; score: number; matched: string[] }[],
  semantic: SemanticCandidate[],
  candidates: IndexedDoc[],
  ctx: RetrievalContext,
) {
  const byId = new Map(candidates.map((d) => [d.chunk.id, d]));
  const scores = new Map<string, { doc: IndexedDoc; score: number; matched: string[]; fusedScore: number }>();
  lexical.forEach((l, i) => scores.set(l.doc.chunk.id, { ...l, fusedScore: 1 / (RRF_K + i + 1) }));
  const bySim = [...semantic].filter((s) => s.similarity > 0).sort((a, b) => b.similarity - a.similarity);
  const byFts = [...semantic].filter((s) => s.ftsRank > 0).sort((a, b) => b.ftsRank - a.ftsRank);
  for (const [list, weight] of [
    [bySim, 1],
    [byFts, 0.5],
  ] as const) {
    list.forEach((s, i) => {
      const doc = byId.get(s.id);
      if (!doc) return;
      const entry = scores.get(s.id) ?? { doc, score: 0, matched: [], fusedScore: 0 };
      entry.fusedScore += (weight * contextBoost(doc.chunk, ctx)) / (RRF_K + i + 1);
      scores.set(s.id, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.fusedScore - a.fusedScore);
}

/** Pick the most relevant verbatim segment of a chunk and mark matching words. */
export function buildExcerpt(content: string, terms: string[], maxLength = 260): Excerpt {
  const segments = segmentsOf(content);
  const termSet = new Set(terms);
  let best = segments[0] ?? { start: 0, end: content.length };
  let bestHits = -1;
  for (const seg of segments) {
    const hits = tokenize(content.slice(seg.start, seg.end)).filter((t) => termSet.has(stem(t))).length;
    if (hits > bestHits) {
      best = seg;
      bestHits = hits;
    }
  }
  const start = best.start;
  let end = best.end;
  if (end - start > maxLength) end = start + maxLength;
  // Extend short segments with their neighbours for context.
  while (end - start < 120 && end < content.length) end = Math.min(content.length, end + 80);
  end = Math.min(end, start + maxLength);
  const text = content.slice(start, end).trim();
  const highlights: [number, number][] = [];
  const wordRe = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text))) {
    const toks = tokenize(m[0]);
    if (toks.length && termSet.has(stem(toks[0]!))) highlights.push([m.index, m.index + m[0].length]);
  }
  return { text, highlights, truncatedStart: start > 0, truncatedEnd: end < content.length };
}

function segmentsOf(content: string): { start: number; end: number }[] {
  const segs: { start: number; end: number }[] = [];
  const re = /[^;.\n]+[;.\n]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m[0].trim()) segs.push({ start: m.index, end: m.index + m[0].length });
  }
  return segs;
}
