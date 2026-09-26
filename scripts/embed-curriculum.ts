/**
 * Computes embeddings for curriculum chunks that lack them (or whose text changed)
 * and stores them in Supabase (pgvector). Enables the semantic leg of hybrid search.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… AI_GATEWAY_API_KEY=… npm run curriculum:embed
 *
 * Uses the service role (server-side only, never shipped to the browser).
 * Requires supabase/seed.sql to have been applied first.
 */
import { createClient } from '@supabase/supabase-js';
import { embedMany } from 'ai';
import { resolveEmbeddingModel } from '../src/lib/ai/provider';
import { config } from '../src/lib/config';
import { corpus } from '../src/lib/curriculum';
import { SECTION_LABELS } from '../src/lib/curriculum/sections';

const BATCH = 64;

async function main() {
  const url = config.supabaseUrl;
  const key = config.supabaseServiceRoleKey;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.');
  const model = resolveEmbeddingModel();
  if (!model) throw new Error(`No hay credenciales para el modelo de embeddings ${config.embeddingModel}.`);
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await db
    .from('curriculum_chunks')
    .select('id, content_hash, embedding_model')
    .eq('curriculum_version', corpus.version.id)
    .eq('status', 'active')
    .or(`embedding.is.null,embedding_model.neq.${config.embeddingModel}`);
  if (error) throw new Error(error.message);
  const pending = new Set((rows ?? []).map((r) => r.id as string));
  const chunks = corpus.chunks.filter((c) => pending.has(c.id));
  console.log(`${chunks.length} fragmentos sin embedding (de ${corpus.chunks.length}).`);

  const titles = new Map(corpus.experiences.map((e) => [e.id, e.title]));
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    // Section + experience title give the vector the context a teacher query carries.
    const values = batch.map((c) => `${SECTION_LABELS[c.section]}${c.experienceId ? ` · ${titles.get(c.experienceId)}` : ''}\n${c.content}`);
    const { embeddings } = await embedMany({ model, values, maxRetries: 2 });
    for (let j = 0; j < batch.length; j++) {
      const { error: upErr } = await db
        .from('curriculum_chunks')
        .update({ embedding: JSON.stringify(embeddings[j]), embedding_model: config.embeddingModel })
        .eq('curriculum_version', corpus.version.id)
        .eq('id', batch[j]!.id);
      if (upErr) throw new Error(`${batch[j]!.id}: ${upErr.message}`);
    }
    console.log(`  ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
  }
  console.log('Embeddings al día.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
