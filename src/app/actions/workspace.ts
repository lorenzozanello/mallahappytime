'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getExperience, getExperienceById, isLevelId, isPeriod } from '@/lib/curriculum';
import { buildQuickView } from '@/lib/curriculum/quick-view';
import { requireSession } from '@/lib/auth/session';
import { ideaToPlanningContent, rehydrateIdea, savedIdeaPayloadSchema } from '@/lib/happy/saved-idea';
import { planningContentSchema, type PlanningContent } from '@/lib/workspace/types';

const experienceIdSchema = z.string().regex(/^HT-(S1|S2|S3|K|T)-P[1-4]$/);

export async function toggleFavorite(experienceId: string): Promise<{ favorite: boolean }> {
  const { profile, repo } = await requireSession();
  const exp = getExperienceById(experienceIdSchema.parse(experienceId));
  if (!exp) throw new Error('Experiencia no encontrada');
  const existing = await repo.findFavorite(profile.id, exp.id);
  if (existing) {
    await repo.deleteSaved(profile.id, existing.id);
  } else {
    await repo.createSaved(profile.id, { kind: 'favorite', title: exp.title, levelId: exp.levelId, period: exp.period, experienceId: exp.id });
  }
  revalidatePath('/guardados');
  return { favorite: !existing };
}

export async function saveHappyIdea(input: unknown): Promise<{ id: string }> {
  const { profile, repo } = await requireSession();
  const payload = savedIdeaPayloadSchema.parse(input);
  const exp = payload.context.experienceId ? getExperienceById(payload.context.experienceId) : undefined;
  const title =
    payload.turn.development?.title || payload.selectedOptionTitle || payload.turn.options[0]?.title || payload.message.slice(0, 80);
  const item = await repo.createSaved(profile.id, {
    kind: 'happy_idea',
    title: title.slice(0, 280),
    levelId: exp?.levelId ?? null,
    period: exp?.period ?? null,
    experienceId: exp?.id ?? null,
    payload,
  });
  revalidatePath('/guardados');
  revalidatePath('/');
  return { id: item.id };
}

export async function deleteSavedItem(id: string) {
  const { profile, repo } = await requireSession();
  await repo.deleteSaved(profile.id, z.string().min(1).max(64).parse(id));
  revalidatePath('/guardados');
  revalidatePath('/');
}

function emptyContent(): PlanningContent {
  return planningContentSchema.parse({});
}

export async function createPlanFromExperience(experienceId: string) {
  const { profile, repo } = await requireSession();
  const exp = getExperienceById(experienceIdSchema.parse(experienceId));
  if (!exp) throw new Error('Experiencia no encontrada');
  const quick = buildQuickView(exp);
  const content = emptyContent();
  content.intention = exp.fields.alcance;
  content.connections = [
    { sourceId: `${exp.id}-ALC`, label: 'Alcance de la experiencia' },
    ...quick.find((s) => s.key === 'observar')!.bullets.slice(0, 1).map((b) => ({ sourceId: b.sourceId, label: 'Indicadores de desarrollo' })),
  ];
  content.origin = `Creada desde la experiencia «${exp.title}» (texto del alcance tomado de la malla).`;
  const plan = await repo.createPlan(profile.id, { title: exp.title, levelId: exp.levelId, period: exp.period, experienceId: exp.id, content });
  redirect(`/guardados/planeaciones/${plan.id}`);
}

export async function createBlankPlan() {
  const { profile, repo } = await requireSession();
  const exp = profile.activeLevelId && profile.activePeriod ? getExperience(profile.activeLevelId, profile.activePeriod) : undefined;
  const plan = await repo.createPlan(profile.id, {
    title: 'Nueva planeación',
    levelId: exp?.levelId ?? null,
    period: exp?.period ?? null,
    experienceId: exp?.id ?? null,
    content: emptyContent(),
  });
  redirect(`/guardados/planeaciones/${plan.id}`);
}

export async function createPlanFromIdea(savedItemId: string) {
  const { profile, repo } = await requireSession();
  const saved = await repo.getSaved(profile.id, z.string().min(1).max(64).parse(savedItemId));
  if (!saved || saved.kind !== 'happy_idea') throw new Error('Idea no encontrada');
  const idea = rehydrateIdea(saved.payload);
  if (!idea) throw new Error('La idea guardada no tiene un formato válido');
  const { title, content } = ideaToPlanningContent(idea, saved.createdAt);
  const plan = await repo.createPlan(profile.id, {
    title: title.slice(0, 280),
    levelId: saved.levelId,
    period: saved.period,
    experienceId: saved.experienceId,
    content,
    sourceSavedItemId: saved.id,
  });
  redirect(`/guardados/planeaciones/${plan.id}`);
}

const savePlanSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1, 'La planeación necesita un título').max(280),
  content: planningContentSchema,
});

export async function savePlan(input: unknown): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const { profile, repo } = await requireSession();
  const parsed = savePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos no válidos' };
  const plan = await repo.updatePlan(profile.id, parsed.data.id, { title: parsed.data.title, content: parsed.data.content });
  if (!plan) return { ok: false, error: 'No se encontró la planeación' };
  revalidatePath('/guardados');
  return { ok: true, updatedAt: plan.updatedAt };
}

export async function deletePlan(id: string) {
  const { profile, repo } = await requireSession();
  await repo.deletePlan(profile.id, z.string().min(1).max(64).parse(id));
  revalidatePath('/guardados');
  redirect('/guardados?tab=planeaciones');
}

export async function updateActiveContext(formData: FormData) {
  const { profile, repo } = await requireSession();
  const level = String(formData.get('levelId') ?? '');
  const period = Number(formData.get('period'));
  if (!isLevelId(level) || !isPeriod(period)) throw new Error('Nivel o periodo no válido');
  const name = formData.get('displayName');
  await repo.updateProfile(profile.id, {
    activeLevelId: level,
    activePeriod: period,
    ...(typeof name === 'string' && name.trim() && profile.displayName !== name.trim() ? { displayName: name.trim().slice(0, 80) } : {}),
  });
  revalidatePath('/', 'layout');
  const next = String(formData.get('next') ?? '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}
