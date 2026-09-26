import { z } from 'zod';
import type { LevelId, PeriodNumber } from '@/lib/curriculum/types';

export const ROLES = ['teacher', 'coordinator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  teacher: 'Docente',
  coordinator: 'Coordinación',
  admin: 'Administración',
};

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  activeLevelId: LevelId | null;
  activePeriod: PeriodNumber | null;
  email?: string | null;
}

export const SAVED_KINDS = ['favorite', 'happy_idea', 'note'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export interface SavedItem {
  id: string;
  kind: SavedKind;
  title: string;
  levelId: LevelId | null;
  period: PeriodNumber | null;
  experienceId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const PLANNING_FIELDS = [
  { key: 'intention', label: 'Intención pedagógica', hint: '¿Qué quieres que vivan y descubran?' },
  { key: 'provocation', label: 'Provocación o inicio', hint: '¿Cómo abrirás la experiencia?' },
  { key: 'development', label: 'Desarrollo', hint: 'Momentos, acciones y juego' },
  { key: 'questions', label: 'Preguntas posibles', hint: 'Preguntas abiertas para acompañar' },
  { key: 'materials', label: 'Materiales y ambiente', hint: 'Espacios, materiales, organización' },
  { key: 'participation', label: 'Otras formas de participación', hint: 'Apoyos y alternativas' },
  { key: 'observe', label: 'Qué observar', hint: 'Manifestaciones observables (sin juicios)' },
  { key: 'notes', label: 'Notas', hint: 'Lo que quieras recordar' },
] as const;

export type PlanningFieldKey = (typeof PLANNING_FIELDS)[number]['key'];

const text = z.string().max(6000).default('');

export const planningContentSchema = z.object({
  intention: text,
  provocation: text,
  development: text,
  questions: text,
  materials: text,
  participation: text,
  observe: text,
  notes: text,
  connections: z
    .array(z.object({ sourceId: z.string().max(40), label: z.string().max(300) }))
    .max(30)
    .default([]),
  origin: z.string().max(300).optional(),
});

export type PlanningContent = z.infer<typeof planningContentSchema>;

export interface PlanningDraft {
  id: string;
  title: string;
  levelId: LevelId | null;
  period: PeriodNumber | null;
  experienceId: string | null;
  content: PlanningContent;
  sourceSavedItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HappyEventInput {
  mode: string;
  model: string;
  promptVersion: string;
  latencyMs: number | null;
  retrievalCount: number;
  sourceIds: string[];
  validationStatus: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  errorCode: string | null;
  levelId: string | null;
  period: number | null;
}

export interface HappyStats {
  total: number;
  last7Days: number;
  byMode: Record<string, number>;
  byValidation: Record<string, number>;
  avgLatencyMs: number | null;
  feedback: { useful: number; notUseful: number };
  recent: (HappyEventInput & { id: string; createdAt: string })[];
}
