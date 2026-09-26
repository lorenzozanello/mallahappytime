import { corpus } from '../../src/lib/curriculum';
import { RetrievalIndex } from '../../src/lib/retrieval/engine';
const idx = new RetrievalIndex(corpus.chunks, new Map(corpus.experiences.map((e) => [e.id, e.title])));
const queries = process.argv.slice(2);
for (const q of queries) {
  const r = await idx.search({ query: q, limit: 6 });
  console.log(`\n### ${q}  concepts=${r.concepts.map((c) => c.key).join(',')}`);
  for (const h of r.hits) console.log(`  ${h.score.toFixed(2)} ${h.chunk.id.padEnd(18)} ${h.excerpt.text.slice(0, 90)}`);
}
