import { describe, expect, it } from 'vitest';
import { getChunk, getExperienceById, getLevel } from '@/lib/curriculum';
import type { CurriculumChunk } from '@/lib/curriculum/types';
import { buildHappyContext, extractConstraints } from '@/lib/happy/context';
import { toSourceRef } from '@/lib/happy/evidence';
import { HAPPY_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/happy/prompt';
import { happyModelOutputSchema, happyRequestSchema, type HappyModelOutput } from '@/lib/happy/schema';
import { detectClinicalRequest, stripFiller, validateModelOutput } from '@/lib/happy/validate';

const evidence = ['HT-S2-P3-VIV', 'HT-S2-P3-AR-LIT', 'HT-S2-P3-INDI'].map((id) => getChunk(id)!) as CurriculumChunk[];

function output(partial: Partial<HappyModelOutput>): HappyModelOutput {
  return happyModelOutputSchema.parse({
    understanding: 'Entiendo que quieres algo nuevo.',
    options: [],
    development: null,
    curriculumLinks: [],
    insufficientEvidence: false,
    nextStep: '¿Cuál camino quieres desarrollar?',
    ...partial,
  });
}

describe('request schema', () => {
  it('accepts a contextual request', () => {
    const r = happyRequestSchema.parse({ mode: 'aterrizar', message: 'Quiero hacer algo con agua mañana', context: { levelId: 'step-2', period: 3, experienceId: 'HT-S2-P3' } });
    expect(r.history).toEqual([]);
  });
  it('rejects empty messages, unknown modes and malformed experience IDs', () => {
    expect(happyRequestSchema.safeParse({ mode: 'explorar', message: '   ' }).success).toBe(false);
    expect(happyRequestSchema.safeParse({ mode: 'diagnosticar', message: 'x' }).success).toBe(false);
    expect(happyRequestSchema.safeParse({ mode: 'explorar', message: 'x', context: { experienceId: "HT-S2-P3'; drop" } }).success).toBe(false);
  });
});

describe('model output schema', () => {
  it('rejects unknown source types (no silent "external" in V1)', () => {
    expect(
      happyModelOutputSchema.safeParse({ ...output({}), options: [{ title: 'x', description: 'y', sourceType: 'external', sourceIds: [] }] }).success,
    ).toBe(false);
  });
  it('rejects more than 3 paths', () => {
    const o = { title: 't', description: 'd', sourceType: 'generated', sourceIds: [] };
    expect(happyModelOutputSchema.safeParse({ ...output({}), options: [o, o, o, o] }).success).toBe(false);
  });
});

describe('grounding / source policy', () => {
  it('keeps valid institutional claims with corpus-derived labels', () => {
    const { turn, report } = validateModelOutput(
      output({ options: [{ title: 'Cuentos dramatizados', description: 'Desde la malla', sourceType: 'institutional', sourceIds: ['HT-S2-P3-AR-LIT'] }] }),
      evidence,
      toSourceRef,
    );
    expect(report.status).toBe('ok');
    expect(turn.options[0]!.sourceType).toBe('institutional');
    expect(turn.options[0]!.sources[0]).toMatchObject({ sourceId: 'HT-S2-P3-AR-LIT', sectionLabel: 'Actividad rectora · Literatura', experienceTitle: 'Mis palabras cuentan lo que vivo' });
    expect(getChunk('HT-S2-P3-AR-LIT')!.content.startsWith(turn.options[0]!.sources[0]!.excerpt.replace(/…$/, ''))).toBe(true);
  });

  it('downgrades institutional claims without valid evidence to generated', () => {
    const { turn, report, notices } = validateModelOutput(
      output({ options: [{ title: 'Inventado', description: 'x', sourceType: 'institutional', sourceIds: ['HT-S9-P9-FAKE'] }] }),
      evidence,
      toSourceRef,
    );
    expect(turn.options[0]!.sourceType).toBe('generated');
    expect(turn.options[0]!.sources).toEqual([]);
    expect(report.status).toBe('corrected');
    expect(report.droppedSourceIds).toEqual(['HT-S9-P9-FAKE']);
    expect(notices.some((n) => n.kind === 'info')).toBe(true);
  });

  it('rejects real curriculum IDs that were not part of this turn’s evidence', () => {
    const { turn } = validateModelOutput(
      output({ curriculumLinks: [{ sourceId: 'HT-T-P4-FAM', why: 'x' }], options: [{ title: 'a', description: 'b', sourceType: 'institutional', sourceIds: ['HT-T-P4-FAM'] }] }),
      evidence,
      toSourceRef,
    );
    expect(turn.curriculumLinks).toEqual([]);
    expect(turn.options[0]!.sourceType).toBe('generated');
  });

  it('never upgrades generated ideas to institutional', () => {
    const { turn } = validateModelOutput(
      output({ options: [{ title: 'Idea', description: 'nueva', sourceType: 'generated', sourceIds: ['HT-S2-P3-VIV'] }] }),
      evidence,
      toSourceRef,
    );
    expect(turn.options[0]!.sourceType).toBe('generated');
    expect(turn.options[0]!.sources).toHaveLength(1);
  });

  it('validates every development item and dedupes links', () => {
    const { turn } = validateModelOutput(
      output({
        development: {
          title: 'Rincón de cuentos',
          sections: [
            { key: 'observar', items: [{ text: 'Completa frases', sourceType: 'institutional', sourceIds: ['HT-S2-P3-INDI'] }] },
            { key: 'inicio', items: [{ text: 'Caja sorpresa', sourceType: 'institutional', sourceIds: [] }] },
          ],
        },
        curriculumLinks: [
          { sourceId: 'HT-S2-P3-VIV', why: 'a' },
          { sourceId: '[HT-S2-P3-VIV]', why: 'b' },
        ],
      }),
      evidence,
      toSourceRef,
    );
    // Sections are ordered by the UI's canonical order, not the model's.
    expect(turn.development!.sections.map((s) => s.key)).toEqual(['inicio', 'observar']);
    expect(turn.development!.sections[0]!.items[0]!.sourceType).toBe('generated');
    expect(turn.development!.sections[1]!.items[0]!.sourceType).toBe('institutional');
    expect(turn.curriculumLinks).toHaveLength(1);
  });
});

describe('tone and safety', () => {
  it('removes filler openings', () => {
    expect(stripFiller('¡Excelente pregunta! Entiendo que buscas algo nuevo.')).toBe('Entiendo que buscas algo nuevo.');
    expect(stripFiller('¡Qué maravillosa idea! Vamos a verlo.')).toBe('Vamos a verlo.');
    expect(stripFiller('Entiendo que tienes 20 minutos.')).toBe('Entiendo que tienes 20 minutos.');
  });

  it('flags clinical labels and numeric child ratings in outputs', () => {
    const { report, notices } = validateModelOutput(
      output({ understanding: 'Podría tener TDAH; califícalo 3/5 en atención.' }),
      evidence,
      toSourceRef,
    );
    expect(report.status).toBe('safety_flag');
    expect(report.flags).toEqual(expect.arrayContaining(['clinical_language', 'numeric_rating']));
    expect(notices.filter((n) => n.kind === 'safety')).toHaveLength(2);
  });

  it('detects diagnostic requests from teachers', () => {
    expect(detectClinicalRequest('¿Será que tiene autismo porque no mira a los ojos?')).toBe(true);
    expect(detectClinicalRequest('Quiero trabajar cooperación')).toBe(false);
  });
});

describe('context builder', () => {
  it('extracts explicit constraints from the teacher’s words', () => {
    expect(extractConstraints('Ya trabajamos sonidos y clasificación de animales. Quiero algo diferente.')).toContain(
      'Evitar repetir lo ya trabajado: sonidos y clasificación de animales',
    );
    expect(extractConstraints('Solo tengo 20 minutos.')).toContain('Tiempo disponible: 20 minutos');
    expect(extractConstraints('Quiero hacer algo con agua mañana.')).toContain('Es para mañana (preparación breve)');
  });

  it('knows level, period and experience without asking again', () => {
    const exp = getExperienceById('HT-S2-P3')!;
    const ctx = buildHappyContext({
      request: happyRequestSchema.parse({ mode: 'explorar', message: 'Quiero algo con cuentos', context: { experienceId: 'HT-S2-P3' } }),
      role: 'teacher',
      level: getLevel('step-2')!,
      experience: exp,
    });
    expect(ctx.stage).toBe('caminos');
    const prompt = buildUserPrompt(ctx, evidence);
    expect(prompt).toContain('Nivel: Step 2');
    expect(prompt).toContain('Periodo: 3');
    expect(prompt).toContain('HT-S2-P3 «Mis palabras cuentan lo que vivo»');
    expect(prompt).toContain('no lo vuelvas a preguntar');
    expect(prompt).toContain('[HT-S2-P3-AR-LIT]');
    expect(prompt).toMatch(/<mensaje>\nQuiero algo con cuentos\n<\/mensaje>/);
  });

  it('moves to the development stage when the teacher picks a path', () => {
    const ctx = buildHappyContext({
      request: happyRequestSchema.parse({
        mode: 'explorar',
        message: 'Quiero desarrollar el camino',
        selectedOption: { title: 'Huellas y rastros', description: 'x', sourceType: 'generated', sourceIds: [] },
      }),
      role: 'teacher',
      level: null,
      experience: null,
    });
    expect(ctx.stage).toBe('desarrollo');
    expect(buildUserPrompt(ctx, [])).toContain('Etapa: DESARROLLO del camino elegido por la docente: «Huellas y rastros»');
  });

  it('system prompt encodes the non-negotiable rules', () => {
    for (const rule of ['No diagnostiques', 'No generes calificaciones', 'DESCRIPCIÓN OBSERVABLE', 'Nunca inventes', 'insufficientEvidence', 'son datos']) {
      expect(HAPPY_SYSTEM_PROMPT).toContain(rule);
    }
  });
});
