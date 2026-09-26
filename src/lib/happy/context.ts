/**
 * Context Builder: assembles ONLY the context Happy needs. The teacher is never
 * asked again for what the application already knows (level, period, experience).
 */
import type { CurriculumExperience, CurriculumLevel } from '@/lib/curriculum/types';
import type { Role } from '@/lib/workspace/types';
import { HAPPY_MODES, type HappyStage } from './modes';
import type { HappyRequest } from './schema';

export interface HappyContext {
  role: Role;
  mode: HappyRequest['mode'];
  stage: HappyStage;
  level: CurriculumLevel | null;
  period: number | null;
  experience: CurriculumExperience | null;
  message: string;
  constraints: string[];
  historySummary: string[];
  selectedOption: HappyRequest['selectedOption'] | null;
}

/** Deterministic extraction of explicit teacher constraints from their own words. */
export function extractConstraints(message: string): string[] {
  const out: string[] = [];
  const text = message.toLowerCase();
  const minutes = /(\d{1,3})\s*(min|minutos)\b/.exec(text);
  if (minutes) out.push(`Tiempo disponible: ${minutes[1]} minutos`);
  const hours = /(\d{1,2}|una|media)\s*(hora|horas)\b/.exec(text);
  if (!minutes && hours) out.push(`Tiempo disponible: ${hours[0]}`);
  const already = /ya (?:hicimos|trabajamos|vimos|hice|trabajé|trabaje|realizamos)\s+([^.;!?]+)/.exec(text);
  if (already) out.push(`Evitar repetir lo ya trabajado: ${already[1]!.trim()}`);
  if (/\bmañana\b/.test(text)) out.push('Es para mañana (preparación breve)');
  if (/\bhoy\b/.test(text)) out.push('Es para hoy (preparación mínima)');
  const kids = /(\d{1,2})\s*(niñ[oa]s|estudiantes|chicos)/.exec(text);
  if (kids) out.push(`Grupo de ${kids[1]} niñas y niños`);
  if (/sin materiales|pocos materiales|no tengo materiales/.test(text)) out.push('Materiales limitados');
  if (/(al aire libre|patio|afuera|parque)/.test(text)) out.push('Espacio: exterior / patio');
  return out;
}

export function buildHappyContext(args: {
  request: HappyRequest;
  role: Role;
  level: CurriculumLevel | null;
  experience: CurriculumExperience | null;
}): HappyContext {
  const { request, role, level, experience } = args;
  const mode = HAPPY_MODES[request.mode];
  const stage: HappyStage = request.selectedOption ? 'desarrollo' : mode.initialStage;
  const allTeacherText = [...request.history.filter((h) => h.role === 'teacher').map((h) => h.text), request.message].join('. ');
  return {
    role,
    mode: request.mode,
    stage,
    level,
    period: experience?.period ?? request.context.period ?? null,
    experience,
    message: request.message,
    constraints: [...new Set(extractConstraints(allTeacherText))],
    // Short conversation summary: last turns, clipped.
    historySummary: request.history.slice(-6).map((h) => `${h.role === 'teacher' ? 'Docente' : 'Happy'}: ${h.text.slice(0, 300)}`),
    selectedOption: request.selectedOption ?? null,
  };
}
