import { describe, expect, it, vi } from 'vitest';
import { corpus } from '@/lib/curriculum';
import { RetrievalIndex, buildExcerpt, type SemanticProvider } from '@/lib/retrieval/engine';
import { detectConcepts } from '@/lib/retrieval/concepts';
import { stem, tokenize } from '@/lib/retrieval/tokenize';

const index = new RetrievalIndex(corpus.chunks, new Map(corpus.experiences.map((e) => [e.id, e.title])));
const search = (query: string, extra: Partial<Parameters<RetrievalIndex['search']>[0]> = {}) =>
  index.search({ query, limit: 8, ...extra });

describe('tokenization', () => {
  it('folds accents, case and plurals', () => {
    expect(tokenize('¿Qué OBSERVAR en la Literatura?')).toEqual(['observar', 'literatura']);
    expect(stem('cuentos')).toBe(stem('cuento'));
    expect(stem('familias')).toBe(stem('familia'));
  });
});

describe('teacher vocabulary', () => {
  it.each([
    ['actividades literarias', 'literatura'],
    ['qué observar', 'observar'],
    ['participación de familias', 'familias'],
    ['cooperación', 'cooperacion'],
    ['turnos', 'turnos'],
    ['actividades rectoras', 'rectoras'],
    ['¿Qué experiencias anteriores preparan este aprendizaje?', 'progresion'],
    ['Solo tengo 20 minutos para contar', 'pensamiento'],
  ])('"%s" is understood as %s', (q, key) => {
    expect(detectConcepts(q).map((m) => m.concept.key)).toContain(key);
  });

  it('does not confuse "contexto" with counting', () => {
    expect(detectConcepts('contexto caribe').map((m) => m.concept.key)).not.toContain('pensamiento');
  });
});

describe('search on representative teacher queries', () => {
  it('actividades literarias → literature activities', async () => {
    const r = await search('actividades literarias');
    expect(r.hits.slice(0, 5).every((h) => h.chunk.section === 'literatura')).toBe(true);
  });

  it('turnos → fragments about turn-taking', async () => {
    const r = await search('turnos');
    expect(r.hits.slice(0, 5).every((h) => /turno/i.test(h.chunk.content))).toBe(true);
  });

  it('cooperación → cooperation content', async () => {
    const r = await search('cooperación');
    expect(r.hits.slice(0, 5).every((h) => /cooper|coopera/i.test(h.chunk.content))).toBe(true);
  });

  it('arte → art activities', async () => {
    const r = await search('arte');
    expect(r.hits[0]!.chunk.section).toBe('arte');
  });

  it('participación de familias → family alliance', async () => {
    const r = await search('participación de familias');
    expect(r.hits.slice(0, 5).every((h) => h.chunk.section === 'familia')).toBe(true);
  });

  it('qué observar → indicators and observation', async () => {
    const r = await search('qué observar');
    expect(r.hits.slice(0, 5).every((h) => ['indicadores', 'observacion', 'valorar', 'evidencias'].includes(h.chunk.section))).toBe(true);
  });

  it('indicadores del periodo, scoped to Step 2 · Periodo 3', async () => {
    const r = await search('indicadores del periodo', { filters: { levelId: 'step-2', period: 3 } });
    expect(r.hits[0]!.chunk.id).toBe('HT-S2-P3-INDI');
    expect(r.hits.every((h) => h.chunk.levelId === null || (h.chunk.levelId === 'step-2' && (h.chunk.period ?? 3) === 3))).toBe(true);
  });

  it('actividades rectoras → the four rectora activities', async () => {
    const r = await search('actividades rectoras', { limit: 12 });
    expect(r.hits.every((h) => ['juego', 'exploracion', 'literatura', 'arte'].includes(h.chunk.section))).toBe(true);
  });

  it('context boosts the teacher’s current experience', async () => {
    const r = await search('cuentos', { context: { levelId: 'step-2', period: 3, experienceId: 'HT-S2-P3' } });
    expect(r.hits[0]!.chunk.experienceId).toBe('HT-S2-P3');
  });

  it('caps hits per experience for diversity', async () => {
    const r = await search('cuentos', { perExperienceCap: 1, limit: 10 });
    const ids = r.hits.map((h) => h.chunk.experienceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns nothing for unrelated queries instead of noise', async () => {
    const r = await search('xilófono cuántico');
    expect(r.hits).toHaveLength(0);
  });

  it('all hits are institutional chunks with source references', async () => {
    const r = await search('emociones');
    for (const h of r.hits) {
      expect(h.chunk.authority).toBe('institutional');
      expect(h.chunk.sourceReference.cell).toMatch(/^[A-Z]+\d+$/);
      expect(h.chunk.content.includes(h.excerpt.text)).toBe(true);
    }
  });
});

describe('excerpts', () => {
  it('picks the matching segment and highlights terms', () => {
    const e = buildExcerpt('Uno dos tres; cuentos y rimas para leer; otra cosa distinta.', [stem('cuentos')]);
    expect(e.text).toContain('cuentos y rimas');
    const [s, t] = e.highlights[0]!;
    expect(e.text.slice(s, t)).toBe('cuentos');
  });
});

describe('semantic leg', () => {
  it('fuses database candidates when available', async () => {
    const provider: SemanticProvider = vi.fn(async () => [{ id: 'HT-T-P2-AR-LIT', similarity: 0.9, ftsRank: 0.2 }]);
    const r = await index.search({ query: 'libros', limit: 10 }, provider);
    expect(r.semantic).toBe('used');
    expect(r.hits.map((h) => h.chunk.id)).toContain('HT-T-P2-AR-LIT');
  });

  it('reports (does not hide) semantic failures and still returns lexical results', async () => {
    const r = await index.search({ query: 'cuentos' }, async () => {
      throw new Error('boom');
    });
    expect(r.semantic).toBe('error');
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it('reports not_configured when there is no database leg', async () => {
    const r = await index.search({ query: 'cuentos' }, async () => 'not_configured');
    expect(r.semantic).toBe('not_configured');
  });
});
