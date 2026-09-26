import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { AppSession } from '@/lib/auth/session';
import { happyRequestSchema } from '@/lib/happy/schema';
import { FileWorkspaceRepository } from '@/lib/workspace/file-repository';

// The provider is swapped per test: this is the only seam the service needs.
const resolved = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/lib/ai/provider', async () => {
  const { createGroundedMockModel } = await import('@/lib/ai/mock-model');
  return {
    resolveHappyModel: () => resolved.current ?? { status: 'ready', id: 'mock/grounded', route: 'mock', model: createGroundedMockModel() },
    resolveEmbeddingModel: () => null,
  };
});

const { runHappyTurn, runFieldAssist } = await import('@/lib/happy/service');
const { gatherEvidence } = await import('@/lib/happy/evidence');
const { buildHappyContext } = await import('@/lib/happy/context');
const { getExperienceById, getLevel } = await import('@/lib/curriculum');

function jsonModel(payload: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: { inputTokens: { total: 1000, noCache: 1000, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 200, text: 200, reasoning: undefined } },
      warnings: [],
    }),
  });
}

let session: AppSession;
let repo: FileWorkspaceRepository;
beforeEach(async () => {
  resolved.current = null;
  repo = new FileWorkspaceRepository(mkdtempSync(path.join(tmpdir(), 'happy-')));
  const profile = await repo.ensureProfile({ id: 'u1', displayName: 'Ana', role: 'teacher', activeLevelId: 'step-2', activePeriod: 3 });
  session = { profile, repo, mode: 'demo' };
});

const req = (over: Record<string, unknown> = {}) =>
  happyRequestSchema.parse({ mode: 'explorar', message: 'Quiero trabajar animales pero ya hicimos sonidos y clasificación.', context: { levelId: 'step-2', period: 3 }, ...over });

describe('evidence retrieval for Happy', () => {
  it('uses the current experience plus search hits, never the whole curriculum', async () => {
    const ctx = buildHappyContext({ request: req(), role: 'teacher', level: getLevel('step-2')!, experience: getExperienceById('HT-S2-P3')! });
    const { chunks } = await gatherEvidence(ctx);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.length).toBeLessThanOrEqual(16);
    expect(chunks.map((c) => c.id)).toContain('HT-S2-P3-ALC');
    expect(chunks.every((c) => c.authority === 'institutional')).toBe(true);
  });

  it('brings progression summaries for "what comes before" questions', async () => {
    const ctx = buildHappyContext({
      request: req({ mode: 'conectar', message: '¿Qué experiencias anteriores preparan este aprendizaje?' }),
      role: 'teacher',
      level: getLevel('step-2')!,
      experience: getExperienceById('HT-S2-P3')!,
    });
    const ids = (await gatherEvidence(ctx)).chunks.map((c) => c.id);
    expect(ids.some((id) => id.startsWith('HT-S1-DIM-'))).toBe(true);
  });
});

describe('runHappyTurn (grounded mock model)', () => {
  it('returns a validated, context-aware turn and records metadata-only observability', async () => {
    const turn = await runHappyTurn(req(), session);
    expect(turn.stage).toBe('caminos');
    expect(turn.meta).toMatchObject({ route: 'mock', grounding: 'model', validation: 'corrected' });
    // The mock cites a fake ID on purpose: it must be dropped and downgraded.
    const invalid = turn.options.find((o) => o.title.includes('inválida'))!;
    expect(invalid.sourceType).toBe('generated');
    expect(invalid.sources).toEqual([]);
    expect(turn.options.find((o) => o.sourceType === 'institutional')!.sources[0]!.sourceId).toMatch(/^HT-S2-P3-/);
    expect(turn.eventId).toBeTruthy();
    const stats = await repo.happyStats();
    expect(stats.total).toBe(1);
    expect(stats.recent[0]).toMatchObject({ mode: 'explorar', model: 'mock/grounded', levelId: 'step-2', period: 3 });
    expect(JSON.stringify(stats.recent[0])).not.toContain('animales'); // no teacher content stored
  });

  it('develops a chosen path', async () => {
    const turn = await runHappyTurn(
      req({ message: 'Quiero desarrollar el camino', selectedOption: { title: 'Rastros y huellas', description: 'x', sourceType: 'generated', sourceIds: ['HT-S2-P3-AR-EXP'] } }),
      session,
    );
    expect(turn.stage).toBe('desarrollo');
    expect(turn.development?.title).toBe('Rastros y huellas');
    expect(turn.development?.sections.length).toBeGreaterThan(0);
  });

  it('enforces policy on a real-shaped model output', async () => {
    resolved.current = {
      status: 'ready',
      id: 'test/model',
      route: 'direct',
      model: jsonModel({
        understanding: '¡Excelente pregunta! Quieres ir más allá de sonidos y clasificación.',
        options: [
          { title: 'Huellas y rastros', description: 'Explorar huellas.', sourceType: 'generated', sourceIds: [] },
          { title: 'Animales y ambientes', description: 'Dice la malla…', sourceType: 'institutional', sourceIds: ['HT-X-P1-NOPE'] },
        ],
        development: null,
        curriculumLinks: [{ sourceId: 'HT-S2-P3-ALC', why: 'Amplía el lenguaje.' }],
        insufficientEvidence: false,
        nextStep: '¿Cuál quieres desarrollar?',
      }),
    };
    const turn = await runHappyTurn(req(), session);
    expect(turn.understanding.startsWith('Quieres')).toBe(true);
    expect(turn.options[1]!.sourceType).toBe('generated');
    expect(turn.curriculumLinks[0]!.sourceId).toBe('HT-S2-P3-ALC');
    expect(turn.meta.validation).toBe('corrected');
  });

  it('falls back visibly to "solo malla" when no model is configured', async () => {
    resolved.current = { status: 'unavailable', id: 'anthropic/x', reason: 'sin credenciales' };
    const turn = await runHappyTurn(req({ mode: 'conectar', message: 'cooperación' }), session);
    expect(turn.meta.grounding).toBe('retrieval_only');
    expect(turn.options).toEqual([]);
    expect(turn.curriculumLinks.length).toBeGreaterThan(0);
    expect(turn.notices[0]!.kind).toBe('warning');
    expect((await repo.happyStats()).recent[0]!.errorCode).toBe('model_unavailable');
  });

  it('reports model failures instead of hiding them', async () => {
    resolved.current = {
      status: 'ready',
      id: 'test/broken',
      route: 'direct',
      model: new MockLanguageModelV4({ doGenerate: async () => { throw new Error('provider down'); } }),
    };
    const turn = await runHappyTurn(req(), session);
    expect(turn.meta.grounding).toBe('retrieval_only');
    expect(turn.notices.some((n) => n.text.includes('no pudo generar'))).toBe(true);
  });

  it('rejects invalid structured output (schema validation)', async () => {
    resolved.current = { status: 'ready', id: 'test/bad', route: 'direct', model: jsonModel({ understanding: 42, options: 'nope' }) };
    const turn = await runHappyTurn(req(), session);
    expect(turn.meta.grounding).toBe('retrieval_only');
  });

  it('adds a safety notice when the teacher asks for a diagnosis', async () => {
    const turn = await runHappyTurn(req({ message: '¿Este niño tiene TDAH? No se queda quieto.' }), session);
    expect(turn.notices.some((n) => n.kind === 'safety')).toBe(true);
  });
});

describe('runFieldAssist', () => {
  it('assists a single planning field with labelled suggestions', async () => {
    const r = await runFieldAssist({ field: 'questions', planTitle: 'Cuentos', draft: { intention: 'Narrar' }, context: { levelId: 'step-2', period: 3 } }, session);
    expect(r.items.length).toBe(2);
    expect(r.items[0]!.sourceType).toBe('institutional');
    expect(r.items[1]!.sourceType).toBe('generated');
    expect((await repo.happyStats()).byMode['asistir:questions']).toBe(1);
  });
});
