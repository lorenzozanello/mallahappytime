import Image from 'next/image';
import Link from 'next/link';
import { getLevel } from '@/lib/curriculum';
import type { Profile } from '@/lib/workspace/types';
import { DesktopNav } from './PrimaryNav';

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

export function AppHeader({ profile }: { profile: Profile }) {
  const level = profile.activeLevelId ? getLevel(profile.activeLevelId) : undefined;
  const initial = (profile.displayName || 'D').charAt(0).toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Happy Time, inicio">
          <Image src="/brand/happy-64.png" alt="" width={34} height={34} className="rounded-full" aria-hidden />
          <span className="hidden text-[1.05rem] font-extrabold tracking-tight text-ink sm:inline">Happy Time</span>
        </Link>
        <div className="flex-1 md:flex md:justify-center">
          <DesktopNav />
        </div>
        <Link
          href="/perfil#contexto"
          className="inline-flex min-h-[40px] items-center rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold text-ink-soft hover:border-ink-muted"
          aria-label={level ? `Contexto activo: ${level.name}, periodo ${profile.activePeriod}. Cambiar` : 'Elegir nivel y periodo'}
        >
          {level ? `${level.name} · P${ROMAN[profile.activePeriod ?? 0]}` : 'Elegir nivel'}
        </Link>
        <Link
          href="/perfil"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun font-bold text-ink"
          aria-label="Perfil y más herramientas"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}

export function DemoBanner() {
  return (
    <div role="note" className="bg-warn-soft px-4 py-1.5 text-center text-xs font-medium text-warn">
      Modo demostración: datos de prueba, sin autenticación real ni persistencia garantizada.
    </div>
  );
}
