'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/app/actions/workspace';

export function FavoriteButton({ experienceId, initial }: { experienceId: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      aria-pressed={favorite}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            setError(false);
            const r = await toggleFavorite(experienceId);
            setFavorite(r.favorite);
          } catch {
            setError(true);
          }
        })
      }
    >
      {favorite ? <BookmarkCheck className="h-5 w-5 text-brand" aria-hidden /> : <Bookmark className="h-5 w-5" aria-hidden />}
      {error ? 'No se pudo guardar' : favorite ? 'En favoritos' : 'Guardar'}
    </button>
  );
}
