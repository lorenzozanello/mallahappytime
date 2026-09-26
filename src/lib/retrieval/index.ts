import 'server-only';
import { embed } from 'ai';
import { corpus } from '@/lib/curriculum';
import { resolveEmbeddingModel } from '@/lib/ai/provider';
import { isSupabaseConfigured } from '@/lib/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RetrievalIndex, type RetrievalOptions, type RetrievalResult, type SemanticProvider } from './engine';

export type { RetrievalHit, RetrievalResult, RetrievalContext, RetrievalFilters } from './engine';

let index: RetrievalIndex | null = null;

export function getRetrievalIndex(): RetrievalIndex {
  index ??= new RetrievalIndex(corpus.chunks, new Map(corpus.experiences.map((e) => [e.id, e.title])));
  return index;
}

/**
 * Database leg: query embedding + Postgres FTS through the match_curriculum_chunks RPC.
 * Only active when Supabase and an embedding model are configured.
 */
const supabaseSemantic: SemanticProvider = async (query, f) => {
  if (!isSupabaseConfigured()) return 'not_configured';
  const model = resolveEmbeddingModel();
  if (!model) return 'not_configured';
  const { embedding } = await embed({ model, value: query, maxRetries: 1 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('match_curriculum_chunks', {
    query_text: query,
    query_embedding: JSON.stringify(embedding),
    filter_level: f.levelId ?? null,
    filter_period: f.period ?? null,
    filter_experience: f.experienceId ?? null,
    match_count: 30,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; similarity: number; fts_rank: number }) => ({
    id: r.id,
    similarity: r.similarity,
    ftsRank: r.fts_rank,
  }));
};

export async function retrieveCurriculum(opts: RetrievalOptions): Promise<RetrievalResult> {
  return getRetrievalIndex().search(opts, supabaseSemantic);
}
