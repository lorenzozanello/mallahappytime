'use client';

import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';

/** Destructive action with explicit confirmation. */
export function DeleteButton({ action, label = 'Eliminar', confirmText }: { action: () => Promise<void>; label?: string; confirmText: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost text-danger"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) start(() => action());
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden /> {pending ? 'Eliminando…' : label}
    </button>
  );
}
