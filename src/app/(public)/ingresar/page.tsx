import { redirect } from 'next/navigation';
import { demoSignIn } from '@/app/actions/auth';
import { HappyAvatar, HappyTimeLogo } from '@/components/brand/Happy';
import { getSession } from '@/lib/auth/session';
import { backendMode } from '@/lib/config';
import { ROLE_LABELS, ROLES } from '@/lib/workspace/types';
import { MagicLinkForm, PasswordForm } from './LoginForms';

export const metadata = { title: 'Ingresar' };

export default async function IngresarPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const mode = backendMode();
  if (mode === 'unconfigured') redirect('/configuracion');
  if (await getSession()) redirect('/');
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <HappyTimeLogo className="h-28 w-28 object-contain" />
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Plataforma curricular</h1>
        <p className="mt-1 flex items-center gap-2 text-ink-soft">
          <HappyAvatar size={22} /> Malla, guardados y Happy, tu asistente curricular.
        </p>
      </div>

      {error === 'enlace' && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          El enlace no es válido o ya expiró. Solicita uno nuevo.
        </p>
      )}

      {mode === 'supabase' ? (
        <div className="card space-y-6 p-5">
          <PasswordForm />
          <div className="border-t border-line pt-5">
            <MagicLinkForm />
          </div>
          <p className="text-xs text-ink-muted">Las cuentas las crea la institución. Si no tienes acceso, escribe a coordinación.</p>
        </div>
      ) : (
        <form action={demoSignIn} className="card space-y-4 p-5">
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            Modo demostración: sin autenticación real. No ingreses información sensible.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Tu nombre</span>
            <input name="name" defaultValue="Docente" maxLength={60} className="field" />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Entrar como</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <label key={r}>
                  <input type="radio" name="role" value={r} defaultChecked={r === 'teacher'} className="peer sr-only" />
                  <span className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface px-2 text-center text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                    {ROLE_LABELS[r]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn-primary w-full">
            Entrar
          </button>
        </form>
      )}
    </main>
  );
}
