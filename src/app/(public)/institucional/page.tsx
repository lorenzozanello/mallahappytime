import Link from 'next/link';
import { HappyTimeLogo } from '@/components/brand/Happy';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { corpus, getExperiencesForLevel, getLevels, getPrinciples } from '@/lib/curriculum';
import { DIMENSIONS } from '@/lib/curriculum/sections';

export const metadata = { title: 'Nuestro modelo curricular' };

/**
 * Public institutional overview (coordination, families, external stakeholders).
 * Uses only institutional curriculum; never touches teacher workspaces.
 */
export default function InstitucionalPage() {
  const levels = getLevels();
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-5">
          <HappyTimeLogo className="h-16 w-16 object-contain" />
          <div>
            <p className="eyebrow">Happy Time · Centro Educativo Infantil</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Nuestro modelo curricular</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <section className="space-y-3">
          <p className="text-lg text-ink-soft">
            En Happy Time, cada nivel vive cuatro <strong className="text-ink">experiencias integradoras</strong> a lo largo del año. En cada una, el juego, el arte,
            la literatura y la exploración del medio se viven de forma integrada, acompañando el desarrollo de niñas y niños desde sus intereses y su contexto
            Caribe.
          </p>
          <div className="flex items-center gap-2">
            <SourceBadge type="institutional" />
            <span className="text-sm text-ink-muted">{corpus.version.label}</span>
          </div>
        </section>

        <section aria-labelledby="principios" className="card p-5">
          <h2 id="principios" className="mb-3 text-xl font-bold">
            Principios
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {getPrinciples().map((p) => (
              <li key={p.id} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {p.content}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="como" className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h2 id="como" className="mb-2 text-xl font-bold">
              Cómo se vive cada experiencia
            </h2>
            <p className="mb-3 text-ink-soft">Cada experiencia recorre cuatro momentos pedagógicos:</p>
            <ol className="space-y-1.5">
              {['Indagar', 'Proyectar', 'Vivir la experiencia', 'Valorar el proceso'].map((m, i) => (
                <li key={m} className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-sun text-sm font-bold">{i + 1}</span>
                  {m}
                </li>
              ))}
            </ol>
          </div>
          <div className="card p-5">
            <h2 className="mb-2 text-xl font-bold">Actividades rectoras y dimensiones</h2>
            <p className="text-ink-soft">
              <strong className="text-ink">Actividades rectoras:</strong> juego, exploración del medio, literatura y arte.
            </p>
            <p className="mt-2 text-ink-soft">
              <strong className="text-ink">Dimensiones del desarrollo:</strong> {DIMENSIONS.map((d) => d.label.toLowerCase()).join(', ')}.
            </p>
          </div>
        </section>

        <section aria-labelledby="niveles" className="space-y-4">
          <h2 id="niveles" className="text-xl font-bold">
            Niveles y experiencias
          </h2>
          {levels.map((l) => (
            <article key={l.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {l.name} <span className="font-normal text-ink-muted">· {l.equivalence}</span>
                </h3>
                <span className="text-sm text-ink-muted">
                  {l.entryAge} a {l.exitAge}
                </span>
              </div>
              <p className="text-sm text-ink-muted">{l.cycle}</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {getExperiencesForLevel(l.id).map((e) => (
                  <li key={e.id} className="rounded-xl bg-canvas px-3 py-2">
                    <span className="text-xs font-bold text-brand">{e.periodLabel}</span>
                    <span className="block font-semibold leading-snug">{e.title}</span>
                  </li>
                ))}
              </ol>
              <details className="mt-3">
                <summary className="inline-flex min-h-[40px] cursor-pointer items-center text-sm font-semibold text-brand">Al finalizar el nivel</summary>
                <p className="mt-1 text-ink-soft">{l.exitProfile}</p>
              </details>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 text-sm text-ink-soft sm:grid-cols-2">
          <div>
            <p className="font-bold text-ink">Happy Time · Centro Educativo Infantil</p>
            <p>Cl. 85 #642, Barranquilla, Atlántico, Colombia</p>
            <p>
              <a href="mailto:contactenos@happytime.edu.co" className="hover:underline">
                contactenos@happytime.edu.co
              </a>{' '}
              ·{' '}
              <a href="tel:+573174277935" className="hover:underline">
                +57 317 4277935
              </a>
            </p>
            <p>
              <a href="https://happytime.edu.co/" className="hover:underline" rel="noopener noreferrer" target="_blank">
                happytime.edu.co
              </a>
            </p>
          </div>
          <div className="sm:text-right">
            <p>Desarrollado por The Balance Corp.</p>
            <Link href="/ingresar" className="mt-2 inline-block font-semibold text-brand hover:underline">
              Acceso docentes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
