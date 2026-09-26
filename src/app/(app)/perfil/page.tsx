import { ArrowRight, Building2, LayoutGrid, LogOut, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { ContextPicker } from '@/components/curriculum/ContextPicker';
import { canAccess, requireSession } from '@/lib/auth/session';
import { getLevels } from '@/lib/curriculum';
import { ROLE_LABELS } from '@/lib/workspace/types';

export const metadata = { title: 'Perfil' };

export default async function PerfilPage() {
  const { profile, mode } = await requireSession();
  const tools = [
    { href: '/progresion', label: 'Progresión por dimensión', desc: 'Qué precede, qué se espera y qué sigue', Icon: TrendingUp, show: true },
    { href: '/institucional', label: 'Vista institucional', desc: 'El modelo curricular para comunidad y familias', Icon: Building2, show: true },
    { href: '/coordinacion', label: 'Coordinación', desc: 'Panorama de toda la malla', Icon: LayoutGrid, show: canAccess(profile.role, 'coordination') },
    { href: '/admin', label: 'Administración', desc: 'Versión curricular, usuarios y Happy', Icon: Settings, show: canAccess(profile.role, 'admin') },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{profile.displayName || 'Perfil'}</h1>
        <p className="text-ink-soft">
          {ROLE_LABELS[profile.role]}
          {profile.email && ` · ${profile.email}`}
        </p>
      </div>

      <section id="contexto" className="card scroll-mt-24 p-5" aria-labelledby="ctx">
        <h2 id="ctx" className="text-lg font-bold">
          Mi nivel y periodo
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Define tu experiencia actual en Inicio y el contexto que Happy ya conoce.</p>
        <ContextPicker levels={getLevels()} levelId={profile.activeLevelId} period={profile.activePeriod} next="/" />
      </section>

      <section aria-labelledby="mas" className="space-y-2">
        <h2 id="mas" className="eyebrow">
          Más herramientas
        </h2>
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="card flex min-h-[64px] items-center gap-3 px-4 py-3 hover:border-line-strong">
            <t.Icon className="h-5 w-5 text-ink-muted" aria-hidden />
            <span className="flex-1">
              <span className="block font-semibold">{t.label}</span>
              <span className="text-sm text-ink-muted">{t.desc}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
          </Link>
        ))}
      </section>

      <form action={signOut}>
        <button type="submit" className="btn btn-secondary w-full sm:w-auto">
          <LogOut className="h-4 w-4" aria-hidden /> {mode === 'demo' ? 'Salir de la demostración' : 'Cerrar sesión'}
        </button>
      </form>
    </div>
  );
}
