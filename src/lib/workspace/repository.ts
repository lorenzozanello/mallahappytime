import type { LevelId, PeriodNumber } from '@/lib/curriculum/types';
import type {
  HappyEventInput,
  HappyStats,
  PlanningContent,
  PlanningDraft,
  Profile,
  Role,
  SavedItem,
  SavedKind,
} from './types';

export interface NewSavedItem {
  kind: SavedKind;
  title: string;
  levelId?: LevelId | null;
  period?: PeriodNumber | null;
  experienceId?: string | null;
  payload?: Record<string, unknown>;
}

export interface NewPlanningDraft {
  title: string;
  levelId?: LevelId | null;
  period?: PeriodNumber | null;
  experienceId?: string | null;
  content: PlanningContent;
  sourceSavedItemId?: string | null;
}

export interface ProfilePatch {
  displayName?: string;
  activeLevelId?: LevelId | null;
  activePeriod?: PeriodNumber | null;
}

/**
 * Persistence boundary for the teacher workspace. Every method is scoped to the
 * acting user; the Supabase implementation additionally relies on RLS.
 */
export interface WorkspaceRepository {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<void>;

  listSaved(userId: string, kind?: SavedKind): Promise<SavedItem[]>;
  getSaved(userId: string, id: string): Promise<SavedItem | null>;
  createSaved(userId: string, item: NewSavedItem): Promise<SavedItem>;
  deleteSaved(userId: string, id: string): Promise<void>;
  findFavorite(userId: string, experienceId: string): Promise<SavedItem | null>;

  listPlans(userId: string): Promise<PlanningDraft[]>;
  getPlan(userId: string, id: string): Promise<PlanningDraft | null>;
  createPlan(userId: string, plan: NewPlanningDraft): Promise<PlanningDraft>;
  updatePlan(userId: string, id: string, patch: { title?: string; content?: PlanningContent }): Promise<PlanningDraft | null>;
  deletePlan(userId: string, id: string): Promise<void>;

  recordHappyEvent(userId: string, event: HappyEventInput): Promise<string | null>;
  recordFeedback(userId: string, eventId: string, rating: 'useful' | 'not_useful', nextAction?: string | null): Promise<void>;

  /** Admin-only operations (callers must check the role; Supabase also enforces it). */
  listProfiles(): Promise<Profile[]>;
  setUserRole(targetUserId: string, role: Role): Promise<void>;
  happyStats(): Promise<HappyStats>;
}
