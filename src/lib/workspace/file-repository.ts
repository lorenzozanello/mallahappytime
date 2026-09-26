import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { NewPlanningDraft, NewSavedItem, ProfilePatch, WorkspaceRepository } from './repository';
import { computeHappyStats } from './stats';
import type { HappyEventInput, PlanningDraft, Profile, Role, SavedItem } from './types';

/**
 * DEMO-ONLY persistence (HAPPY_DEMO_MODE=true): a JSON file on the server.
 * Used for local development, e2e tests and credential-less previews. It is NOT
 * durable on serverless platforms and the UI says so. Production uses Supabase.
 */
interface Store {
  profiles: Record<string, Profile>;
  saved: (SavedItem & { userId: string })[];
  plans: (PlanningDraft & { userId: string })[];
  events: (HappyEventInput & { id: string; userId: string; createdAt: string })[];
  feedback: { eventId: string; userId: string; rating: 'useful' | 'not_useful'; nextAction: string | null }[];
}

const empty = (): Store => ({ profiles: {}, saved: [], plans: [], events: [], feedback: [] });

export class FileWorkspaceRepository implements WorkspaceRepository {
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.file = path.resolve(dir, 'workspace.json');
  }

  private async load(): Promise<Store> {
    try {
      return { ...empty(), ...(JSON.parse(await readFile(this.file, 'utf8')) as Partial<Store>) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return empty();
      throw err;
    }
  }

  private async save(store: Store) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 1));
    await rename(tmp, this.file);
  }

  /** Serialises read-modify-write cycles within this process. */
  private mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const store = await this.load();
      const result = await fn(store);
      await this.save(store);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async ensureProfile(profile: Profile): Promise<Profile> {
    return this.mutate((s) => {
      const existing = s.profiles[profile.id];
      s.profiles[profile.id] = existing ? { ...existing, role: profile.role } : profile;
      return s.profiles[profile.id]!;
    });
  }

  async getProfile(userId: string) {
    return (await this.load()).profiles[userId] ?? null;
  }

  async updateProfile(userId: string, patch: ProfilePatch) {
    await this.mutate((s) => {
      const p = s.profiles[userId];
      if (!p) return;
      s.profiles[userId] = {
        ...p,
        ...(patch.displayName !== undefined && { displayName: patch.displayName }),
        ...(patch.activeLevelId !== undefined && { activeLevelId: patch.activeLevelId }),
        ...(patch.activePeriod !== undefined && { activePeriod: patch.activePeriod }),
      };
    });
  }

  async listSaved(userId: string, kind?: SavedItem['kind']) {
    const s = await this.load();
    return s.saved
      .filter((i) => i.userId === userId && (!kind || i.kind === kind))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(strip);
  }

  async getSaved(userId: string, id: string) {
    const item = (await this.load()).saved.find((i) => i.userId === userId && i.id === id);
    return item ? strip(item) : null;
  }

  async createSaved(userId: string, item: NewSavedItem) {
    return this.mutate((s) => {
      if (item.kind === 'favorite' && item.experienceId) {
        const dup = s.saved.find((i) => i.userId === userId && i.kind === 'favorite' && i.experienceId === item.experienceId);
        if (dup) return strip(dup);
      }
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(),
        userId,
        kind: item.kind,
        title: item.title,
        levelId: item.levelId ?? null,
        period: item.period ?? null,
        experienceId: item.experienceId ?? null,
        payload: item.payload ?? {},
        createdAt: now,
        updatedAt: now,
      };
      s.saved.push(row);
      return strip(row);
    });
  }

  async deleteSaved(userId: string, id: string) {
    await this.mutate((s) => {
      s.saved = s.saved.filter((i) => !(i.userId === userId && i.id === id));
      for (const p of s.plans) if (p.sourceSavedItemId === id) p.sourceSavedItemId = null;
    });
  }

  async findFavorite(userId: string, experienceId: string) {
    const item = (await this.load()).saved.find((i) => i.userId === userId && i.kind === 'favorite' && i.experienceId === experienceId);
    return item ? strip(item) : null;
  }

  async listPlans(userId: string) {
    return (await this.load()).plans
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(strip);
  }

  async getPlan(userId: string, id: string) {
    const p = (await this.load()).plans.find((x) => x.userId === userId && x.id === id);
    return p ? strip(p) : null;
  }

  async createPlan(userId: string, plan: NewPlanningDraft) {
    return this.mutate((s) => {
      const now = new Date().toISOString();
      const row = {
        id: randomUUID(),
        userId,
        title: plan.title,
        levelId: plan.levelId ?? null,
        period: plan.period ?? null,
        experienceId: plan.experienceId ?? null,
        content: plan.content,
        sourceSavedItemId: plan.sourceSavedItemId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      s.plans.push(row);
      return strip(row);
    });
  }

  async updatePlan(userId: string, id: string, patch: { title?: string; content?: PlanningDraft['content'] }) {
    return this.mutate((s) => {
      const p = s.plans.find((x) => x.userId === userId && x.id === id);
      if (!p) return null;
      if (patch.title !== undefined) p.title = patch.title;
      if (patch.content !== undefined) p.content = patch.content;
      p.updatedAt = new Date().toISOString();
      return strip(p);
    });
  }

  async deletePlan(userId: string, id: string) {
    await this.mutate((s) => {
      s.plans = s.plans.filter((p) => !(p.userId === userId && p.id === id));
    });
  }

  async recordHappyEvent(userId: string, event: HappyEventInput) {
    return this.mutate((s) => {
      const id = randomUUID();
      s.events.push({ ...event, id, userId, createdAt: new Date().toISOString() });
      if (s.events.length > 2000) s.events = s.events.slice(-2000);
      return id;
    });
  }

  async recordFeedback(userId: string, eventId: string, rating: 'useful' | 'not_useful', nextAction?: string | null) {
    await this.mutate((s) => {
      if (!s.events.some((e) => e.id === eventId && e.userId === userId)) return;
      s.feedback = s.feedback.filter((f) => !(f.eventId === eventId && f.userId === userId));
      s.feedback.push({ eventId, userId, rating, nextAction: nextAction ?? null });
    });
  }

  async listProfiles() {
    return Object.values((await this.load()).profiles).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async setUserRole(targetUserId: string, role: Role) {
    await this.mutate((s) => {
      const p = s.profiles[targetUserId];
      if (p) p.role = role;
    });
  }

  async happyStats() {
    const s = await this.load();
    return computeHappyStats(s.events.map(({ userId: _u, ...e }) => e), s.feedback);
  }
}

function strip<T extends { userId: string }>(row: T): Omit<T, 'userId'> {
  const { userId: _userId, ...rest } = row;
  return rest;
}
