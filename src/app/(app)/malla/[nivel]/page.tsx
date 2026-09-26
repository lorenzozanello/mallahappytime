import { ArrowRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { getExperiencesForLevel, getLevel } from '@/lib/curriculum';

export async function generateMetadata({ params }: { params: Promise<{ nivel: string }> }) {
  const level = getLevel((await params).nivel);
  return { title: level ? level.name : 'Nivel' };
}

export default async function LevelPage({ params }: { params: Promise<{ nivel: string }> }) {
  const level = getLevel((await params).nivel);
  if (!level) notFound();
  const experiences = getExperiencesForLevel(level.id);
  return (
    <div className="space-y-6">
      <Link href="/malla" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Malla
      </Link>
      <div>
        <p className="eyebrow">{level.cycle}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{level.name}</h1>
        <p className="mt-1 text-ink-soft">
          Equivalencia: {level.equivalence} · Edad aproximada: {level.entryAge} a {level.exitAge}
        </p>
      </div>

      <section aria-labelledby="periodos" className="space-y-3">
        <h2 id="periodos" className="eyebrow">
          Experiencias integradoras por periodo
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {experiences.map((e) => (
            <li key={e.id}>
              <Link href={`/malla/${level.id}/${e.period}`} className="card flex h-full flex-col gap-2 p-4 hover:border-line-strong">
                <span className="text-sm font-bold text-brand">
                  {e.periodLabel} · {e.periodCode}
                </span>
                <span className="text-lg font-bold leading-snug">{e.title}</span>
                <span className="line-clamp-3 text-sm text-ink-soft">{e.fields.alcance}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-ink">
                  Ver experiencia <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="perfiles" className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="perfiles" className="text-lg font-bold">
            Perfil del nivel
          </h2>
          <SourceBadge type="institutional" />
        </div>
        <div>
          <h3 className="font-semibold">Perfil de entrada</h3>
          <p className="mt-1 text-ink-soft">{level.entryProfile}</p>
        </div>
        <div>
          <h3 className="font-semibold">Perfil de salida</h3>
          <p className="mt-1 text-ink-soft">{level.exitProfile}</p>
        </div>
        <Link href={`/progresion?nivel=${level.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          Ver progresión por dimensión <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
