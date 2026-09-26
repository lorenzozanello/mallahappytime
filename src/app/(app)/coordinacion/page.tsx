import Link from 'next/link';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { requireRole } from '@/lib/auth/session';
import { corpus, getExperiencesForLevel, getLevels, isLevelId } from '@/lib/curriculum';
import { EXPERIENCE_FIELDS } from '@/lib/curriculum/sections';

export const metadata = { title: 'Coordinación' };

const COMPARABLE = ['alcance', 'procesos', 'indicadores', 'dua', 'familia', 'emocional', 'caribe', 'observacion'] as const;

export default async function CoordinacionPage({ searchParams }: { searchParams: Promise<{ seccion?: string; nivel?: string }> }) {
  await requireRole(['coordinator', 'admin']);
  const sp = await searchParams;
  const levels = getLevels();
  const section = COMPARABLE.find((s) => s === sp.seccion) ?? 'alcance';
  const sectionDef = EXPERIENCE_FIELDS.find((f) => f.key === section)!;
  const levelFilter = sp.nivel && isLevelId(sp.nivel) ? sp.nivel : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Coordinación</h1>
        <p className="mt-1 text-ink-soft">
          Panorama de la malla ({corpus.experiences.length} experiencias en {levels.length} niveles). Compara un mismo aspecto entre periodos y niveles.
        </p>
      </div>

      <section aria-labelledby="mapa" className="space-y-3">
        <h2 id="mapa" className="text-lg font-bold">
          Mapa de experiencias
        </h2>
        <div className="grid gap-3 md:grid-cols-5">
          {levels.map((l) => (
            <div key={l.id} className="card p-3">
              <p className="font-bold">{l.name}</p>
              <p className="mb-2 text-xs text-ink-muted">{l.equivalence}</p>
              <ol className="space-y-1.5">
                {getExperiencesForLevel(l.id).map((e) => (
                  <li key={e.id}>
                    <Link href={`/malla/${l.id}/${e.period}`} className="block rounded-lg bg-canvas px-2 py-1.5 text-sm leading-snug hover:bg-brand-soft">
                      <span className="font-bold text-ink-muted">P{e.period} </span>
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="comparar" className="space-y-3">
        <h2 id="comparar" className="text-lg font-bold">
          Comparar un aspecto
        </h2>
        <form className="flex flex-wrap gap-2" action="/coordinacion">
          <select name="seccion" defaultValue={section} className="field w-auto" aria-label="Aspecto">
            {COMPARABLE.map((s) => (
              <option key={s} value={s}>
                {EXPERIENCE_FIELDS.find((f) => f.key === s)!.label}
              </option>
            ))}
          </select>
          <select name="nivel" defaultValue={levelFilter ?? ''} className="field w-auto" aria-label="Nivel">
            <option value="">Todos los niveles</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="submit">
            Ver
          </button>
        </form>
        <div className="flex items-center gap-2">
          <SourceBadge type="institutional" />
          <span className="text-sm text-ink-muted">{sectionDef.label}</span>
        </div>
        {levels
          .filter((l) => !levelFilter || l.id === levelFilter)
          .map((l) => (
            <div key={l.id} className="card p-4">
              <h3 className="mb-2 font-bold">{l.name}</h3>
              <ol className="grid gap-3 lg:grid-cols-2">
                {getExperiencesForLevel(l.id).map((e) => (
                  <li key={e.id} className="rounded-xl border border-line p-3">
                    <p className="text-xs font-bold text-brand">
                      {e.periodLabel} · {e.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{e.fields[section]}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
      </section>
    </div>
  );
}
