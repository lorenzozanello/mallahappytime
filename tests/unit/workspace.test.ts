import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const { FileWorkspaceRepository } = await import('@/lib/workspace/file-repository');
const { canAccess, parseDemoCookie } = await import('@/lib/auth/session');
const { ideaToPlanningContent, rehydrateIdea } = await import('@/lib/happy/saved-idea');
const { hrefForSourceId } = await import('@/lib/curriculum/ids');
const { planningContentSchema } = await import('@/lib/workspace/types');

function repo() {
  return new FileWorkspaceRepository(mkdtempSync(path.join(tmpdir(), 'ws-')));
}

describe('saved items and planning drafts', () => {
  it('saves, lists, reopens and deletes favorites / ideas / plans', async () => {
    const r = repo();
    const fav = await r.createSaved('a', { kind: 'favorite', title: 'Exp', experienceId: 'HT-S2-P3', levelId: 'step-2', period: 3 });
    const again = await r.createSaved('a', { kind: 'favorite', title: 'Exp', experienceId: 'HT-S2-P3' });
    expect(again.id).toBe(fav.id); // favorites are unique per experience
    const idea = await r.createSaved('a', { kind: 'happy_idea', title: 'Idea', payload: { x: 1 } });
    expect((await r.listSaved('a')).map((s) => s.kind).sort()).toEqual(['favorite', 'happy_idea']);
    expect(await r.getSaved('a', idea.id)).toMatchObject({ title: 'Idea', payload: { x: 1 } });

    const plan = await r.createPlan('a', { title: 'Plan', content: planningContentSchema.parse({ intention: 'x' }), sourceSavedItemId: idea.id });
    const updated = await r.updatePlan('a', plan.id, { title: 'Plan 2', content: { ...plan.content, questions: '¿Qué pasó?' } });
    expect(updated).toMatchObject({ title: 'Plan 2', content: { questions: '¿Qué pasó?' } });
    await r.deleteSaved('a', idea.id);
    expect((await r.getPlan('a', plan.id))!.sourceSavedItemId).toBeNull();
    await r.deletePlan('a', plan.id);
    expect(await r.listPlans('a')).toEqual([]);
  });

  it('isolates workspaces between users', async () => {
    const r = repo();
    const item = await r.createSaved('a', { kind: 'note', title: 'privado' });
    const plan = await r.createPlan('a', { title: 'privado', content: planningContentSchema.parse({}) });
    expect(await r.listSaved('b')).toEqual([]);
    expect(await r.getSaved('b', item.id)).toBeNull();
    expect(await r.getPlan('b', plan.id)).toBeNull();
    expect(await r.updatePlan('b', plan.id, { title: 'hack' })).toBeNull();
    await r.deleteSaved('b', item.id);
    await r.deletePlan('b', plan.id);
    expect(await r.getSaved('a', item.id)).not.toBeNull();
    expect((await r.getPlan('a', plan.id))!.title).toBe('privado');
  });

  it('only accepts feedback for the user’s own events', async () => {
    const r = repo();
    const id = await r.recordHappyEvent('a', { mode: 'explorar', model: 'm', promptVersion: 'v', latencyMs: 10, retrievalCount: 3, sourceIds: [], validationStatus: 'ok', inputTokens: null, outputTokens: null, estimatedCostUsd: null, errorCode: null, levelId: null, period: null });
    await r.recordFeedback('b', id!, 'useful');
    expect((await r.happyStats()).feedback.useful).toBe(0);
    await r.recordFeedback('a', id!, 'useful');
    await r.recordFeedback('a', id!, 'not_useful');
    expect((await r.happyStats()).feedback).toEqual({ useful: 0, notUseful: 1 });
  });
});

describe('roles and demo sessions', () => {
  it('grants coordination and admin areas by role', () => {
    expect(canAccess('teacher', 'coordination')).toBe(false);
    expect(canAccess('teacher', 'admin')).toBe(false);
    expect(canAccess('coordinator', 'coordination')).toBe(true);
    expect(canAccess('coordinator', 'admin')).toBe(false);
    expect(canAccess('admin', 'admin')).toBe(true);
  });

  it('parses only well-formed demo cookies', () => {
    expect(parseDemoCookie(encodeURIComponent(JSON.stringify({ role: 'teacher', name: 'Ana' })))).toEqual({ role: 'teacher', name: 'Ana' });
    expect(parseDemoCookie(encodeURIComponent(JSON.stringify({ role: 'superuser' })))).toBeNull();
    expect(parseDemoCookie('%%%')).toBeNull();
    expect(parseDemoCookie(undefined)).toBeNull();
  });
});

describe('saved Happy ideas', () => {
  const payload = {
    mode: 'explorar',
    message: 'Quiero algo con cuentos',
    context: { experienceId: 'HT-S2-P3' },
    turn: {
      stage: 'desarrollo',
      understanding: 'Entiendo',
      options: [],
      development: {
        title: 'Rincón de títeres',
        sections: [
          { key: 'inicio', heading: 'Para empezar', items: [{ text: 'Caja sorpresa', sourceType: 'generated', sources: [] }] },
          { key: 'observar', heading: 'Qué observar', items: [{ text: 'Completa frases', sourceType: 'institutional', sources: [{ sourceId: 'HT-S2-P3-INDI' }] }] },
          // A tampered item claiming institutional authority with a fake ID:
          { key: 'desarrollo', heading: 'Cómo vivirlo', items: [{ text: 'Dato inventado', sourceType: 'institutional', sources: [{ sourceId: 'HT-FAKE' }] }] },
        ],
      },
      curriculumLinks: [{ sourceId: 'HT-S2-P3-AR-LIT', why: 'títeres' }],
      meta: { model: 'x', route: 'gateway', promptVersion: 'v' },
    },
  };

  it('re-derives provenance from the corpus when reopening', () => {
    const idea = rehydrateIdea(payload)!;
    const items = idea.development!.sections.flatMap((s) => s.items);
    expect(items.find((i) => i.text === 'Completa frases')!.sourceType).toBe('institutional');
    expect(items.find((i) => i.text === 'Dato inventado')!.sourceType).toBe('generated');
    expect(idea.curriculumLinks[0]!.sectionLabel).toBe('Actividad rectora · Literatura');
  });

  it('converts an idea into a planning draft keeping provenance inline', () => {
    const { title, content } = ideaToPlanningContent(rehydrateIdea(payload)!, '2026-09-26T10:00:00Z');
    expect(title).toBe('Rincón de títeres');
    expect(content.intention).toBe('Quiero algo con cuentos');
    expect(content.provocation).toBe('• Caja sorpresa [Idea de Happy]');
    expect(content.observe).toBe('• Completa frases [Malla HT-S2-P3-INDI]');
    expect(content.connections.map((c) => c.sourceId)).toEqual(['HT-S2-P3-AR-LIT', 'HT-S2-P3-INDI']);
    expect(planningContentSchema.safeParse(content).success).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(rehydrateIdea({ mode: 'x' })).toBeNull();
  });
});

describe('source links', () => {
  it('maps canonical IDs to app routes', () => {
    expect(hrefForSourceId('HT-S2-P3-DUA')).toBe('/malla/step-2/3?vista=completa');
    expect(hrefForSourceId('HT-K-DIM-COG')).toBe('/progresion?nivel=kinder');
    expect(hrefForSourceId('HT-INST-PRIN-01')).toBe('/institucional');
    expect(hrefForSourceId('nope')).toBeNull();
  });
});
