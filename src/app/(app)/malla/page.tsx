import { ArrowRight, Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { HappyAvatar } from '@/components/brand/Happy';
import { Highlighted } from '@/components/curriculum/Highlighted';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { requireSession } from '@/lib/auth/session';
import { getExperienceById, getExperiencesForLevel, getLevel, getLevels, isLevelId, isPeriod } from '@/lib/curriculum';
import { SECTION_LABELS } from '@/lib/curriculum/sections';
import { retrieveCurriculum } from '@/lib/retrieval';

export const metadata = { title: 'Malla' };

const SUGGESTIONS = ['actividades literarias', 'turnos', 'cooperación', 'arte', 'participación de familias', 'qué observar', 'indicadores del periodo', 'actividades rectoras'];

function sourceHref(chunk: { experienceId: string | null; section: string; levelId: string | null }) {
  const exp = chunk.experienceId ? getExperienceById(chunk.experienceId) : undefined;
  if (exp) return `/malla/${exp.levelId}/${exp.period}?vista=completa#${chunk.section}`;
  if (chunk.section === 'progresion') return '/progresion';
  if (chunk.section === 'principio') return '/institucional';
  if (chunk.levelId) return `/malla/${chunk.levelId}`;
  return '/malla';
}

export default async function MallaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { profile } = await requireSession();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 200) : '';
  const nivel = typeof sp.nivel === 'string' && isLevelId(sp.nivel) ? sp.nivel : undefined;
  const periodoNum = Number(sp.periodo);
  const periodo = isPeriod(periodoNum) ? periodoNum : undefined;
  const levels = getLevels();

  const result = q
    ? await retrieveCurriculum({
        query: q,
        filters: { levelId: nivel, period: periodo },
        context: { levelId: profile.activeLevelId ?? undefined, period: profile.activePeriod ?? undefined },
        limit: 15,
        perExperienceCap: 2,
      })
    : null;

  const orderedLevels = profile.activeLevelId ? [...levels].sort((a, b) => (a.id === profile.activeLevelId ? -1 : b.id === profile.activeLevelId ? 1 : 0)) : levels;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Malla curricular</h1>
        <p className="mt-1 text-ink-soft">La fuente oficial de Happy Time: niveles, periodos y experiencias integradoras.</p>
      </div>

      <form role="search" action="/malla" className="card space-y-3 p-4">
        <label htmlFor="q" className="block text-lg font-bold">
          ¿Qué estás buscando en nuestra malla?
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Ej.: cuentos, turnos, familias, qué observar…" className="field pl-10" autoComplete="off" enterKeyHint="search" />
          </div>
          <button type="submit" className="btn btn-primary">
            Buscar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select name="nivel" defaultValue={nivel ?? ''} className="field sm:w-48" aria-label="Filtrar por nivel">
            <option value="">Todos los niveles</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select name="periodo" defaultValue={periodo ?? ''} className="field sm:w-48" aria-label="Filtrar por periodo">
            <option value="">Todos los periodos</option>
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                Periodo {['I', 'II', 'III', 'IV'][p - 1]}
              </option>
            ))}
          </select>
        </div>
        {!q && (
          <div className="flex flex-wrap gap-2 pt-1" aria-label="Búsquedas sugeridas">
            {SUGGESTIONS.map((s) => (
              <Link key={s} href={`/malla?q=${encodeURIComponent(s)}`} className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink-soft hover:border-line-strong">
                {s}
              </Link>
            ))}
          </div>
        )}
      </form>

      {result && (
        <section aria-labelledby="resultados" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="resultados" className="text-lg font-bold">
              {result.hits.length ? `${result.hits.length} resultados para “${q}”` : `Sin resultados para “${q}”`}
            </h2>
            <Link href="/malla" className="text-sm font-semibold text-brand hover:underline">
              Limpiar búsqueda
            </Link>
          </div>
          {result.concepts.length > 0 && (
            <p className="text-sm text-ink-muted">
              Buscamos en: {result.concepts.map((c) => c.label).join(' · ')}
            </p>
          )}
          {result.semantic === 'error' && (
            <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              La búsqueda semántica no respondió; mostramos resultados por palabras clave.
            </p>
          )}
          {result.hits.length === 0 && (
            <div className="card p-5 text-ink-soft">
              <p>No encontramos ese tema en la malla. Prueba con otras palabras o pregúntale a Happy cómo se relaciona con nuestra malla.</p>
              <Link href={`/happy?modo=conectar&pregunta=${encodeURIComponent(q)}`} className="btn btn-secondary mt-3">
                <HappyAvatar size={24} /> Preguntar a Happy
              </Link>
            </div>
          )}
          <ul className="space-y-3">
            {result.hits.map(({ chunk, excerpt }) => {
              const exp = chunk.experienceId ? getExperienceById(chunk.experienceId) : undefined;
              const level = chunk.levelId ? getLevel(chunk.levelId) : undefined;
              const sectionLabel = chunk.section === 'progresion' ? `Progresión · ${chunk.subsection}` : SECTION_LABELS[chunk.section];
              return (
                <li key={chunk.id} className="card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <SourceBadge type="institutional" />
                    <span className="text-sm font-semibold text-ink-soft">{sectionLabel}</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {[level?.name, exp?.periodLabel].filter(Boolean).join(' · ')}
                    {exp && <> · <span className="font-semibold text-ink">{exp.title}</span></>}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {excerpt.truncatedStart && '… '}
                    <Highlighted text={excerpt.text} ranges={excerpt.highlights} />
                    {excerpt.truncatedEnd && ' …'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={sourceHref(chunk)} className="btn btn-secondary">
                      {exp ? 'Abrir experiencia' : 'Ver fuente'} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    {exp && (
                      <Link
                        href={`/happy?nivel=${exp.levelId}&periodo=${exp.period}&modo=explorar&pregunta=${encodeURIComponent(q)}`}
                        className="btn btn-ghost text-happy"
                      >
                        <HappyAvatar size={22} /> Trabajar con Happy
                      </Link>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[0.7rem] text-ink-muted">{chunk.id}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!q && (
        <section aria-labelledby="niveles" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="niveles" className="text-lg font-bold">
              Explorar por nivel y periodo
            </h2>
            <Link href="/progresion" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              <TrendingUp className="h-4 w-4" aria-hidden /> Progresión
            </Link>
          </div>
          {orderedLevels.map((l) => (
            <div key={l.id} className="card overflow-hidden">
              <Link href={`/malla/${l.id}`} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 hover:bg-canvas">
                <span>
                  <span className="block text-lg font-bold">
                    {l.name} {l.id === profile.activeLevelId && <span className="ml-1 rounded bg-brand-soft px-1.5 py-0.5 align-middle text-xs font-bold text-brand">Tu nivel</span>}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {l.equivalence} · {l.entryAge} a {l.exitAge}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-ink-muted" aria-hidden />
              </Link>
              <ol className="divide-y divide-line">
                {getExperiencesForLevel(l.id).map((e) => (
                  <li key={e.id}>
                    <Link href={`/malla/${e.levelId}/${e.period}`} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 hover:bg-canvas">
                      <span className="w-10 shrink-0 text-sm font-bold text-ink-muted">P{['I', 'II', 'III', 'IV'][e.period - 1]}</span>
                      <span className="flex-1 font-medium leading-snug">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
