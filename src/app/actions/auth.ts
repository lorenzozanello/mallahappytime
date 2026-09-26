'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { DEMO_COOKIE, requireRole } from '@/lib/auth/session';
import { backendMode } from '@/lib/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ROLES, type Role } from '@/lib/workspace/types';

export type AuthState = { error?: string; message?: string } | undefined;

export async function demoSignIn(formData: FormData) {
  if (backendMode() !== 'demo') throw new Error('El modo demostración no está habilitado.');
  const role = z.enum(ROLES).parse(formData.get('role'));
  const name = String(formData.get('name') ?? '').trim().slice(0, 60) || 'Docente';
  (await cookies()).set(DEMO_COOKIE, encodeURIComponent(JSON.stringify({ role, name })), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/');
}

export async function passwordSignIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (backendMode() !== 'supabase') return { error: 'La autenticación no está configurada.' };
  const parsed = z.object({ email: z.string().email(), password: z.string().min(6) }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Revisa tu correo y contraseña.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'No pudimos iniciar sesión con esos datos.' };
  redirect('/');
}

export async function magicLinkSignIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (backendMode() !== 'supabase') return { error: 'La autenticación no está configurada.' };
  const email = z.string().email().safeParse(formData.get('email'));
  if (!email.success) return { error: 'Escribe un correo válido.' };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const supabase = await createSupabaseServerClient();
  // Accounts are created by the institution; the link never creates new users.
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return { error: 'No pudimos enviar el enlace. Verifica que tu correo esté registrado por la institución.' };
  return { message: 'Te enviamos un enlace de acceso. Revisa tu correo.' };
}

export async function signOut() {
  if (backendMode() === 'demo') {
    (await cookies()).delete(DEMO_COOKIE);
  } else if (backendMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect('/ingresar');
}

export async function setUserRole(formData: FormData) {
  const { repo } = await requireRole(['admin']);
  const userId = z.string().min(1).max(64).parse(formData.get('userId'));
  const role = z.enum(ROLES).parse(formData.get('role')) as Role;
  await repo.setUserRole(userId, role);
  redirect('/admin#usuarios');
}
