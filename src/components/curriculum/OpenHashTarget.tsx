'use client';

import { useEffect } from 'react';

/** Opens the collapsed <details> section that contains the URL #fragment (e.g. from a source link). */
export function OpenHashTarget() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      const details = el?.closest('details');
      if (details && !details.open) details.open = true;
      el?.scrollIntoView({ block: 'start' });
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
