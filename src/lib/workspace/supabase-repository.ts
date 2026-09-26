import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LevelId, PeriodNumber } from '@/lib/curriculum/types';
import type { NewPlanningDraft, NewSavedItem, ProfilePatch, WorkspaceRepository } from './repository';
import { computeHappyStats } from './stats';
import { planningContentSchema, type HappyEventInput, type PlanningDraft, type Profile, type Role, type SavedItem } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are mapped explicitly below */

function toProfile(r: any): Profile {
  return {
    id: r.id,
    displayName: r.display_name ?? '',
    role: r.role,
    activeLevelId: (r.active_level_id ?? null) as LevelId | null,
    activePeriod: (r.active_period ?? null) as PeriodNumber | null,
  };
}

function toSaved(r: any): SavedItem {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    levelId: r.level_id,
    period: r.period,
    experienceId: r.experience_id,
    payload: r.payload ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toPlan(r: any): PlanningDraft {
  return {
    id: r.id,
    title: r.title,
    levelId: r.level_id,
    period: r.period,
    experienceId: r.experience_id,
    content: planningContentSchema.parse(r.content ?? {}),
    sourceSavedItemId: r.source_saved_item_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

/** Supabase-backed workspace. The client carries the user's session, so RLS applies to every query. */
export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private db: SupabaseClient) {}

  async getProfile(userId: string) {
    const data = check(await this.db.from('profiles').select('*').eq('id', userId).maybeSingle());
    return data ? toProfile(data) : null;
  }

  async updateProfile(userId: string, patch: ProfilePatch) {
    const row: Record<string, unknown> = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.activeLevelId !== undefined) row.active_level_id = patch.activeLevelId;
    if (patch.activePeriod !== undefined) row.active_period = patch.activePeriod;
    check(await this.db.from('profiles').update(row).eq('id', userId));
  }

  async listSaved(userId: string, kind?: SavedItem['kind']) {
    let q = this.db.from('saved_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (kind) q = q.eq('kind', kind);
    return (check(await q) ?? []).map(toSaved);
  }

  async getSaved(userId: string, id: string) {
    const data = check(await this.db.from('saved_items').select('*').eq('user_id', userId).eq('id', id).maybeSingle());
    return data ? toSaved(data) : null;
  }

  async createSaved(userId: string, item: NewSavedItem) {
    if (item.kind === 'favorite' && item.experienceId) {
      const existing = await this.findFavorite(userId, item.experienceId);
      if (existing) return existing;
    }
    const data = check(
      await this.db
        .from('saved_items')
        .insert({
          user_id: userId,
          kind: item.kind,
          title: item.title,
          level_id: item.levelId ?? null,
          period: item.period ?? null,
          experience_id: item.experienceId ?? null,
          payload: item.payload ?? {},
        })
        .select('*')
        .single(),
    );
    return toSaved(data);
  }

  async deleteSaved(userId: string, id: string) {
    check(await this.db.from('saved_items').delete().eq('user_id', userId).eq('id', id));
  }

  async findFavorite(userId: string, experienceId: string) {
    const data = check(
      await this.db.from('saved_items').select('*').eq('user_id', userId).eq('kind', 'favorite').eq('experience_id', experienceId).maybeSingle(),
    );
    return data ? toSaved(data) : null;
  }

  async listPlans(userId: string) {
    return (check(await this.db.from('planning_drafts').select('*').eq('user_id', userId).order('updated_at', { ascending: false })) ?? []).map(toPlan);
  }

  async getPlan(userId: string, id: string) {
    const data = check(await this.db.from('planning_drafts').select('*').eq('user_id', userId).eq('id', id).maybeSingle());
    return data ? toPlan(data) : null;
  }

  async createPlan(userId: string, plan: NewPlanningDraft) {
    const data = check(
      await this.db
        .from('planning_drafts')
        .insert({
          user_id: userId,
          title: plan.title,
          level_id: plan.levelId ?? null,
          period: plan.period ?? null,
          experience_id: plan.experienceId ?? null,
          content: plan.content,
          source_saved_item_id: plan.sourceSavedItemId ?? null,
        })
        .select('*')
        .single(),
    );
    return toPlan(data);
  }

  async updatePlan(userId: string, id: string, patch: { title?: string; content?: PlanningDraft['content'] }) {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.content !== undefined) row.content = patch.content;
    const data = check(await this.db.from('planning_drafts').update(row).eq('user_id', userId).eq('id', id).select('*').maybeSingle());
    return data ? toPlan(data) : null;
  }

  async deletePlan(userId: string, id: string) {
    check(await this.db.from('planning_drafts').delete().eq('user_id', userId).eq('id', id));
  }

  async recordHappyEvent(userId: string, e: HappyEventInput) {
    const res = await this.db
      .from('happy_events')
      .insert({
        user_id: userId,
        mode: e.mode,
        model: e.model,
        prompt_version: e.promptVersion,
        latency_ms: e.latencyMs,
        retrieval_count: e.retrievalCount,
        source_ids: e.sourceIds,
        validation_status: e.validationStatus,
        input_tokens: e.inputTokens,
        output_tokens: e.outputTokens,
        estimated_cost_usd: e.estimatedCostUsd,
        error_code: e.errorCode,
        level_id: e.levelId,
        period: e.period,
      })
      .select('id')
      .single();
    // Observability must never break the teacher's flow; failures are logged server-side.
    if (res.error) {
      console.error('[happy] could not record event', res.error.message);
      return null;
    }
    return res.data.id as string;
  }

  async recordFeedback(userId: string, eventId: string, rating: 'useful' | 'not_useful', nextAction?: string | null) {
    check(
      await this.db
        .from('happy_feedback')
        .upsert({ event_id: eventId, user_id: userId, rating, next_action: nextAction ?? null }, { onConflict: 'event_id,user_id' }),
    );
  }

  async listProfiles() {
    return (check(await this.db.from('profiles').select('*').order('display_name')) ?? []).map(toProfile);
  }

  async setUserRole(targetUserId: string, role: Role) {
    check(await this.db.rpc('set_user_role', { target_user: targetUserId, new_role: role }));
  }

  async happyStats() {
    const events = check(await this.db.from('happy_events').select('*').order('created_at', { ascending: false }).limit(500)) ?? [];
    const feedback = check(await this.db.from('happy_feedback').select('rating').limit(2000)) ?? [];
    return computeHappyStats(
      events.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        mode: r.mode,
        model: r.model,
        promptVersion: r.prompt_version,
        latencyMs: r.latency_ms,
        retrievalCount: r.retrieval_count,
        sourceIds: r.source_ids ?? [],
        validationStatus: r.validation_status,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        estimatedCostUsd: r.estimated_cost_usd === null ? null : Number(r.estimated_cost_usd),
        errorCode: r.error_code,
        levelId: r.level_id,
        period: r.period,
      })),
      feedback as { rating: 'useful' | 'not_useful' }[],
    );
  }
}
