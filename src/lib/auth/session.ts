import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { backendMode, config } from '@/lib/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FileWorkspaceRepository } from '@/lib/workspace/file-repository';
import type { WorkspaceRepository } from '@/lib/workspace/repository';
import { SupabaseWorkspaceRepository } from '@/lib/workspace/supabase-repository';
import { ROLES, type Profile, type Role } from '@/lib/workspace/types';

export const DEMO_COOKIE = 'ht_demo_session';

export interface AppSession {
  profile: Profile;
  repo: WorkspaceRepository;
  mode: 'supabase' | 'demo';
}

const DEMO_IDS: Record<Role, string> = {
  teacher: '00000000-0000-4000-8000-000000000001',
  coordinator: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000003',
};

let demoRepo: FileWorkspaceRepository | null = null;
export function getDemoRepository(): FileWorkspaceRepository {
  demoRepo ??= new FileWorkspaceRepository(config.dataDir);
  return demoRepo;
}

export function parseDemoCookie(value: string | undefined): { role: Role; name: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { role?: string; name?: string };
    if (!parsed.role || !ROLES.includes(parsed.role as Role)) return null;
    const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 60) : 'Docente';
    return { role: parsed.role as Role, name };
  } catch {
    return null;
  }
}

export function demoUserId(role: Role): string {
  return DEMO_IDS[role];
}

/** Resolves the signed-in user once per request. */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const mode = backendMode();
  if (mode === 'demo') {
    const demo = parseDemoCookie((await cookies()).get(DEMO_COOKIE)?.value);
    if (!demo) return null;
    const repo = getDemoRepository();
    const profile = await repo.ensureProfile({
      id: DEMO_IDS[demo.role],
      displayName: demo.name,
      role: demo.role,
      activeLevelId: null,
      activePeriod: null,
    });
    return { profile: { ...profile, displayName: demo.name }, repo, mode };
  }
  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (!sub) return null;
    const repo = new SupabaseWorkspaceRepository(supabase);
    const profile = await repo.getProfile(sub);
    if (!profile) return null;
    return { profile: { ...profile, email: (data.claims.email as string | undefined) ?? null }, repo, mode };
  }
  return null;
});

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect(backendMode() === 'unconfigured' ? '/configuracion' : '/ingresar');
  return session;
}

export async function requireRole(roles: Role[]): Promise<AppSession> {
  const session = await requireSession();
  if (!roles.includes(session.profile.role)) redirect('/');
  return session;
}

export function canAccess(role: Role, area: 'coordination' | 'admin'): boolean {
  if (area === 'admin') return role === 'admin';
  return role === 'coordinator' || role === 'admin';
}
