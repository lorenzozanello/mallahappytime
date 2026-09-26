import Link from 'next/link';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { requireSession } from '@/lib/auth/session';
import { getDevelopmentSummaries, getLevels, isLevelId } from '@/lib/curriculum';
import { DIMENSIONS } from '@/lib/curriculum/sections';

export const metadata = { title: 'Progresión' };

export default async function ProgresionPage({ searchParams }: { searchParams: Promise<{ dimension?: string; nivel?: string }> }) {
  const { profile } = await requireSession();
  const sp = await searchParams;
  const dimension = DIMENSIONS.find((d) => d.key === sp.dimension) ?? DIMENSIONS[0];
  const levels = getLevels();
  const focusId = sp.nivel && isLevelId(sp.nivel) ? sp.nivel : (profile.activeLevelId ?? levels[0]!.id);
  const focusIndex = levels.findIndex((l) => l.id === focusId);
  const summaries = getDevelopmentSummaries().filter((d) => d.dimension === dimension.key);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Progresión por dimensión</h1>
        <p className="mt-1 text-ink-soft">Elige una dimensión para ver qué precede, qué se espera ahora y qué sigue.</p>
      </div>

      <nav aria-label="Dimensiones" className="flex flex-wrap gap-2">
        {DIMENSIONS.map((d) => (
          <Link
            key={d.key}
            href={`/progresion?dimension=${d.key}&nivel=${focusId}`}
            aria-current={d.key === dimension.key ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-xl border px-3.5 text-sm font-semibold ${d.key === dimension.key ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-soft'}`}
          >
            {d.label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Nivel de referencia" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-muted">Mi referencia:</span>
        {levels.map((l) => (
          <Link
            key={l.id}
            href={`/progresion?dimension=${dimension.key}&nivel=${l.id}`}
            aria-current={l.id === focusId ? 'true' : undefined}
            className={`inline-flex min-h-[40px] items-center rounded-lg px-2.5 font-semibold ${l.id === focusId ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface'}`}
          >
            {l.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <SourceBadge type="institutional" />
        <span className="text-sm text-ink-muted">Hoja «Progresión por dimensión» de la malla</span>
      </div>

      <ol className="relative space-y-3 border-l-2 border-line pl-5">
        {levels.map((l, i) => {
          const s = summaries.find((x) => x.levelId === l.id);
          const rel = i < focusIndex ? 'Lo que precede' : i === focusIndex ? 'Lo que se espera ahora' : 'Lo que sigue';
          const isFocus = i === focusIndex;
          return (
            <li key={l.id} className="relative">
              <span aria-hidden className={`absolute -left-[27px] top-5 h-3 w-3 rounded-full ${isFocus ? 'bg-brand' : 'bg-line-strong'}`} />
              <div className={`card p-4 ${isFocus ? 'border-brand ring-1 ring-brand' : i < focusIndex ? 'opacity-90' : ''}`}>
                <p className={`eyebrow ${isFocus ? 'text-brand' : ''}`}>{rel}</p>
                <h2 className="mt-0.5 font-bold">
                  {l.name} <span className="font-normal text-ink-muted">· {l.equivalence}</span>
                </h2>
                <p className="mt-1.5 text-ink-soft">{s?.content}</p>
                {s && (
                  <p className="mt-2 font-mono text-[0.68rem] text-ink-muted">
                    {s.id} · {s.sourceReference.sheet}!{s.sourceReference.cell}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
