import { ChevronLeft, ChevronRight, FilePlus2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPlanFromExperience } from '@/app/actions/workspace';
import { HappyAvatar } from '@/components/brand/Happy';
import { FullView, QuickView } from '@/components/curriculum/ExperienceViews';
import { FavoriteButton } from '@/components/curriculum/FavoriteButton';
import { OpenHashTarget } from '@/components/curriculum/OpenHashTarget';
import { requireSession } from '@/lib/auth/session';
import { getExperience, getLevel } from '@/lib/curriculum';

type Params = Promise<{ nivel: string; periodo: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  const e = getExperience(p.nivel, Number(p.periodo));
  return { title: e ? e.title : 'Experiencia' };
}

export default async function ExperiencePage({ params, searchParams }: { params: Params; searchParams: Promise<{ vista?: string }> }) {
  const p = await params;
  const { vista } = await searchParams;
  const experience = getExperience(p.nivel, Number(p.periodo));
  const level = getLevel(p.nivel);
  if (!experience || !level) notFound();
  const { profile, repo } = await requireSession();
  const favorite = Boolean(await repo.findFavorite(profile.id, experience.id));
  const full = vista === 'completa';
  const base = `/malla/${level.id}/${experience.period}`;
  const prev = experience.period > 1 ? `/malla/${level.id}/${experience.period - 1}` : null;
  const next = experience.period < 4 ? `/malla/${level.id}/${experience.period + 1}` : null;
  const createPlan = createPlanFromExperience.bind(null, experience.id);

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-1 text-sm font-semibold text-ink-soft">
        <Link href="/malla" className="inline-flex min-h-[44px] items-center gap-1 hover:text-ink">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Malla
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/malla/${level.id}`} className="inline-flex min-h-[44px] items-center hover:text-ink">
          {level.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink-muted">{experience.periodLabel}</span>
      </nav>

      <header className="space-y-3">
        <p className="eyebrow">
          {level.name} · {experience.periodLabel} · {experience.periodCode}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{experience.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/happy?nivel=${level.id}&periodo=${experience.period}`} className="btn btn-happy">
            <HappyAvatar size={24} className="ring-2 ring-white/60" /> Trabajar con Happy
          </Link>
          <FavoriteButton experienceId={experience.id} initial={favorite} />
          <form action={createPlan}>
            <button type="submit" className="btn btn-secondary">
              <FilePlus2 className="h-5 w-5" aria-hidden /> Crear planeación
            </button>
          </form>
        </div>
      </header>

      <div role="tablist" aria-label="Vista de la experiencia" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
        <Link
          role="tab"
          aria-selected={!full}
          href={base}
          scroll={false}
          className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-bold ${!full ? 'bg-brand-soft text-brand' : 'text-ink-soft'}`}
        >
          Vista rápida
        </Link>
        <Link
          role="tab"
          aria-selected={full}
          href={`${base}?vista=completa`}
          scroll={false}
          className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-bold ${full ? 'bg-brand-soft text-brand' : 'text-ink-soft'}`}
        >
          Ficha completa
        </Link>
      </div>

      <div role="tabpanel">
        {full ? (
          <>
            <OpenHashTarget />
            <FullView experience={experience} />
          </>
        ) : (
          <>
            <QuickView experience={experience} />
            <Link href={`${base}?vista=completa`} className="btn btn-secondary mt-4 w-full">
              Ver ficha curricular completa
            </Link>
          </>
        )}
      </div>

      <nav aria-label="Otros periodos" className="flex justify-between gap-2 border-t border-line pt-4">
        {prev ? (
          <Link href={prev} className="btn btn-ghost">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Periodo anterior
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next} className="btn btn-ghost">
            Periodo siguiente <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  );
}
