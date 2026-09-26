'use client';

import { useActionState } from 'react';
import { magicLinkSignIn, passwordSignIn, type AuthState } from '@/app/actions/auth';

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(passwordSignIn, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Correo institucional</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Contraseña</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}

export function MagicLinkForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(magicLinkSignIn, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Recibir un enlace de acceso</span>
        <input name="email" type="email" required autoComplete="email" placeholder="tu.correo@…" className="field" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm font-semibold text-official">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-secondary w-full" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </button>
    </form>
  );
}
