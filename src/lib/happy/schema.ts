import { z } from 'zod';
import { DEVELOPMENT_SECTIONS, type DevelopmentSectionKey, type HappyStage } from './modes';

export const SOURCE_TYPES = ['institutional', 'generated'] as const;
/** 'external' is reserved for a future RECURSO EXTERNO source type (not enabled in V1). */
export type SourceType = (typeof SOURCE_TYPES)[number] | 'external';

const LEVELS = ['step-1', 'step-2', 'step-3', 'kinder', 'transicion'] as const;
const sectionKeys = DEVELOPMENT_SECTIONS.map((s) => s.key) as [DevelopmentSectionKey, ...DevelopmentSectionKey[]];

// ---------- Request (browser → server) ----------

export const happyOptionRefSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1200).default(''),
  sourceType: z.enum(SOURCE_TYPES),
  sourceIds: z.array(z.string().max(40)).max(6).default([]),
});

export const happyRequestSchema = z.object({
  mode: z.enum(['explorar', 'aterrizar', 'conectar']),
  message: z.string().trim().min(1, 'Escribe tu mensaje').max(2000),
  context: z
    .object({
      levelId: z.enum(LEVELS).optional(),
      period: z.number().int().min(1).max(4).optional(),
      experienceId: z.string().regex(/^HT-(S1|S2|S3|K|T)-P[1-4]$/).optional(),
    })
    .default({}),
  history: z
    .array(z.object({ role: z.enum(['teacher', 'happy']), text: z.string().max(1200) }))
    .max(8)
    .default([]),
  selectedOption: happyOptionRefSchema.optional(),
});
export type HappyRequest = z.infer<typeof happyRequestSchema>;

// ---------- Model output (validated) ----------

const sourceIdsSchema = z.array(z.string().max(40)).max(5);

export const happyModelOutputSchema = z.object({
  understanding: z.string().max(700).describe('Lo que entiendes de la necesidad de la docente, 1–2 frases.'),
  options: z
    .array(
      z.object({
        title: z.string().max(140),
        description: z.string().max(700),
        sourceType: z.enum(SOURCE_TYPES),
        sourceIds: sourceIdsSchema.describe('IDs exactos de la evidencia de la malla (p. ej. HT-S2-P3-VIV).'),
      }),
    )
    .max(3),
  development: z
    .object({
      title: z.string().max(180),
      sections: z
        .array(
          z.object({
            key: z.enum(sectionKeys),
            items: z
              .array(z.object({ text: z.string().max(600), sourceType: z.enum(SOURCE_TYPES), sourceIds: sourceIdsSchema }))
              .max(5),
          }),
        )
        .max(8),
    })
    .nullable(),
  curriculumLinks: z.array(z.object({ sourceId: z.string().max(40), why: z.string().max(400) })).max(6),
  insufficientEvidence: z.boolean(),
  nextStep: z.string().max(300),
});
export type HappyModelOutput = z.infer<typeof happyModelOutputSchema>;

export const fieldAssistOutputSchema = z.object({
  items: z.array(z.object({ text: z.string().max(500), sourceType: z.enum(SOURCE_TYPES), sourceIds: sourceIdsSchema })).max(6),
  note: z.string().max(300),
});
export type FieldAssistOutput = z.infer<typeof fieldAssistOutputSchema>;

// ---------- Public turn (server → UI). The UI controls presentation. ----------

export interface SourceRef {
  sourceId: string;
  sectionLabel: string;
  experienceTitle: string | null;
  levelPeriod: string | null;
  href: string | null;
  excerpt: string;
}

export interface HappyItem {
  text: string;
  sourceType: SourceType;
  sources: SourceRef[];
}

export interface HappyOption extends HappyItem {
  title: string;
}

export interface HappyNotice {
  kind: 'info' | 'warning' | 'safety';
  text: string;
}

export interface HappyTurn {
  eventId: string | null;
  mode: 'explorar' | 'aterrizar' | 'conectar';
  stage: HappyStage;
  understanding: string;
  options: HappyOption[];
  development: { title: string; sections: { key: DevelopmentSectionKey; heading: string; items: HappyItem[] }[] } | null;
  curriculumLinks: (SourceRef & { why: string | null })[];
  insufficientEvidence: boolean;
  nextStep: string;
  notices: HappyNotice[];
  meta: {
    model: string;
    route: 'gateway' | 'direct' | 'mock' | 'none';
    promptVersion: string;
    grounding: 'model' | 'retrieval_only';
    latencyMs: number;
    evidenceCount: number;
    validation: string;
  };
}

export const fieldAssistRequestSchema = z.object({
  field: z.enum(['intention', 'provocation', 'development', 'questions', 'materials', 'participation', 'observe']),
  planTitle: z.string().max(300).default(''),
  draft: z.record(z.string(), z.string().max(6000)).default({}),
  context: happyRequestSchema.shape.context,
});
export type FieldAssistRequest = z.infer<typeof fieldAssistRequestSchema>;

export interface FieldAssistResult {
  items: HappyItem[];
  note: string;
  notices: HappyNotice[];
  meta: HappyTurn['meta'];
}
