import 'server-only';
import { z } from 'zod';
import { getChunk } from '@/lib/curriculum';
import type { PlanningContent } from '@/lib/workspace/types';
import { toSourceRef } from './evidence';
import type { HappyItem, HappyTurn, SourceRef } from './schema';

/**
 * Saved Happy ideas are stored in the teacher's private workspace. When read back,
 * every source reference is re-derived from the curriculum corpus by ID so a
 * stored (or tampered) payload can never show an unverified "Desde nuestra malla" label.
 */
export const savedIdeaPayloadSchema = z.object({
  mode: z.enum(['explorar', 'aterrizar', 'conectar']),
  message: z.string().max(2000),
  context: z.object({ levelId: z.string().optional(), period: z.number().optional(), experienceId: z.string().optional() }),
  selectedOptionTitle: z.string().max(200).optional(),
  turn: z.object({
    stage: z.string(),
    understanding: z.string().max(2000),
    options: z.array(z.object({ title: z.string().max(200), text: z.string().max(1200), sourceType: z.string(), sources: z.array(z.object({ sourceId: z.string() })) })).max(3),
    development: z
      .object({
        title: z.string().max(300),
        sections: z.array(z.object({ key: z.string(), heading: z.string().max(80), items: z.array(z.object({ text: z.string().max(1200), sourceType: z.string(), sources: z.array(z.object({ sourceId: z.string() })) })).max(8) })).max(8),
      })
      .nullable(),
    curriculumLinks: z.array(z.object({ sourceId: z.string(), why: z.string().max(600).nullable() })).max(8),
    meta: z.object({ model: z.string(), route: z.string(), promptVersion: z.string() }).passthrough(),
  }),
});
export type SavedIdeaPayload = z.infer<typeof savedIdeaPayloadSchema>;

function refs(sources: { sourceId: string }[]): SourceRef[] {
  return sources.flatMap((s) => {
    const c = getChunk(s.sourceId);
    return c ? [toSourceRef(c)] : [];
  });
}

function item(i: { text: string; sourceType: string; sources: { sourceId: string }[] }): HappyItem {
  const sources = refs(i.sources);
  const sourceType = i.sourceType === 'institutional' && sources.length ? 'institutional' : 'generated';
  return { text: i.text, sourceType, sources };
}

export interface RehydratedIdea {
  payload: SavedIdeaPayload;
  understanding: string;
  options: (HappyItem & { title: string })[];
  development: { title: string; sections: { key: string; heading: string; items: HappyItem[] }[] } | null;
  curriculumLinks: (SourceRef & { why: string | null })[];
  simulated: boolean;
}

export function rehydrateIdea(raw: unknown): RehydratedIdea | null {
  const parsed = savedIdeaPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;
  const t = parsed.data.turn;
  return {
    payload: parsed.data,
    understanding: t.understanding,
    options: t.options.map((o) => ({ title: o.title, ...item(o) })),
    development: t.development ? { title: t.development.title, sections: t.development.sections.map((s) => ({ key: s.key, heading: s.heading, items: s.items.map(item) })) } : null,
    curriculumLinks: t.curriculumLinks.flatMap((l) => {
      const c = getChunk(l.sourceId);
      return c ? [{ ...toSourceRef(c), why: l.why }] : [];
    }),
    simulated: t.meta.route === 'mock',
  };
}

const FIELD_BY_SECTION: Record<string, keyof PlanningContent> = {
  inicio: 'provocation',
  desarrollo: 'development',
  preguntas: 'questions',
  materiales: 'materials',
  participacion: 'participation',
  observar: 'observe',
  familias: 'notes',
  cierre: 'development',
};

function line(i: HappyItem): string {
  const tag = i.sourceType === 'institutional' ? `[Malla ${i.sources.map((s) => s.sourceId).join(', ')}]` : '[Idea de Happy]';
  return `• ${i.text} ${tag}`;
}

/** Deterministic conversion of a saved idea into an editable planning draft. Provenance is kept inline. */
export function ideaToPlanningContent(idea: RehydratedIdea, savedAt: string): { title: string; content: PlanningContent } {
  const content: PlanningContent = {
    intention: idea.payload.message,
    provocation: '',
    development: '',
    questions: '',
    materials: '',
    participation: '',
    observe: '',
    notes: '',
    connections: [],
    origin: `Creada desde una idea de Happy guardada el ${savedAt.slice(0, 10)}. Revisa y decide qué conservar.`,
  };
  const append = (field: keyof PlanningContent, text: string) => {
    const current = content[field];
    if (typeof current === 'string') (content[field] as string) = current ? `${current}\n${text}` : text;
  };
  if (idea.development) {
    for (const s of idea.development.sections) for (const i of s.items) append(FIELD_BY_SECTION[s.key] ?? 'notes', line(i));
  } else {
    for (const o of idea.options) append('development', `• ${o.title}: ${o.text} ${o.sourceType === 'institutional' ? `[Malla ${o.sources.map((s) => s.sourceId).join(', ')}]` : '[Idea de Happy]'}`);
  }
  const seen = new Set<string>();
  const allSources = [
    ...idea.curriculumLinks,
    ...idea.options.flatMap((o) => o.sources),
    ...(idea.development?.sections.flatMap((s) => s.items.flatMap((i) => i.sources)) ?? []),
  ];
  for (const s of allSources) {
    if (seen.has(s.sourceId)) continue;
    seen.add(s.sourceId);
    content.connections.push({ sourceId: s.sourceId, label: [s.levelPeriod, s.sectionLabel].filter(Boolean).join(' · ') });
  }
  const title = idea.development?.title || idea.payload.selectedOptionTitle || idea.payload.message.slice(0, 80);
  return { title, content };
}

export function turnToSavedPayload(args: {
  mode: SavedIdeaPayload['mode'];
  message: string;
  context: SavedIdeaPayload['context'];
  selectedOptionTitle?: string;
  turn: HappyTurn;
}): SavedIdeaPayload {
  const strip = (s: SourceRef[]) => s.map((r) => ({ sourceId: r.sourceId }));
  return {
    mode: args.mode,
    message: args.message,
    context: args.context,
    selectedOptionTitle: args.selectedOptionTitle,
    turn: {
      stage: args.turn.stage,
      understanding: args.turn.understanding,
      options: args.turn.options.map((o) => ({ title: o.title, text: o.text, sourceType: o.sourceType, sources: strip(o.sources) })),
      development: args.turn.development
        ? { title: args.turn.development.title, sections: args.turn.development.sections.map((s) => ({ key: s.key, heading: s.heading, items: s.items.map((i) => ({ text: i.text, sourceType: i.sourceType, sources: strip(i.sources) })) })) }
        : null,
      curriculumLinks: args.turn.curriculumLinks.map((l) => ({ sourceId: l.sourceId, why: l.why })),
      meta: { model: args.turn.meta.model, route: args.turn.meta.route, promptVersion: args.turn.meta.promptVersion },
    },
  };
}
