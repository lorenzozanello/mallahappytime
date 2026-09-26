import { ArrowRight, FileText, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { HappyAvatar } from '@/components/brand/Happy';
import { ContextPicker } from '@/components/curriculum/ContextPicker';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { requireSession } from '@/lib/auth/session';
import { experienceHref, getExperience, getLevel, getLevels } from '@/lib/curriculum';
import { buildHomeOverview } from '@/lib/curriculum/quick-view';

export const metadata = { title: 'Inicio' };

export default async function InicioPage() {
  const { profile, repo } = await requireSession();
  const firstName = profile.displayName.split(' ')[0] || 'docente';
  const level = profile.activeLevelId ? getLevel(profile.activeLevelId) : undefined;
  const experience = profile.activeLevelId && profile.activePeriod ? getExperience(profile.activeLevelId, profile.activePeriod) : undefined;

  if (!level || !experience) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Hola, {firstName}</h1>
        <section className="card p-5" aria-labelledby="onboarding">
          <h2 id="onboarding" className="text-lg font-bold">
            ¿Con qué nivel y periodo estás trabajando?
          </h2>
          <p className="mb-4 mt-1 text-ink-soft">Así te mostramos tu experiencia actual y Happy ya sabrá tu contexto.</p>
          <ContextPicker levels={getLevels()} levelId={profile.activeLevelId} period={profile.activePeriod} askName displayName={profile.displayName} />
        </section>
      </div>
    );
  }

  const overview = buildHomeOverview(experience);
  const [plans, ideas] = await Promise.all([repo.listPlans(profile.id), repo.listSaved(profile.id, 'happy_idea')]);
  const recent = [
    ...plans.map((p) => ({ id: p.id, title: p.title, date: p.updatedAt, href: `/guardados/planeaciones/${p.id}`, kind: 'plan' as const })),
    ...ideas.map((i) => ({ id: i.id, title: i.title, date: i.createdAt, href: `/guardados/ideas/${i.id}`, kind: 'idea' as const })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const happyHref = `/happy?nivel=${experience.levelId}&periodo=${experience.period}`;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Hola, {firstName}</h1>
        <p className="mt-1 font-semibold text-ink-soft">
          {level.name} · {experience.periodLabel}{' '}
          <Link href="/perfil#contexto" className="ml-1 text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Cambiar
          </Link>
        </p>
      </div>

      <section className="card overflow-hidden" aria-labelledby="exp-actual">
        <div className="border-b border-line bg-sun-soft/60 px-5 py-4">
          <p className="eyebrow">Experiencia actual</p>
          <h2 id="exp-actual" className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">
            {experience.title}
          </h2>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <h3 className="eyebrow mb-2">Qué buscamos</h3>
            <ul className="space-y-1.5">
              {overview.buscamos.map((b) => (
                <li key={b.text} className="flex gap-2">
                  <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="eyebrow mb-2">Qué podemos observar</h3>
            <ul className="space-y-1.5">
              {overview.observar.map((b) => (
                <li key={b.text} className="flex gap-2">
                  <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-official" />
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
          <SourceBadge type="institutional" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={experienceHref(experience)} className="btn btn-primary">
              Ver experiencia <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={happyHref} className="btn btn-secondary">
              <HappyAvatar size={24} /> Trabajar con Happy
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="continuar">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="continuar" className="eyebrow">
            Continuar
          </h2>
          <Link href="/guardados" className="text-sm font-semibold text-brand hover:underline">
            Ver guardados
          </Link>
        </div>
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={r.href} className="card flex min-h-[56px] items-center gap-3 px-4 py-3 hover:border-line-strong">
                  {r.kind === 'plan' ? <FileText className="h-5 w-5 text-brand" aria-hidden /> : <Lightbulb className="h-5 w-5 text-happy" aria-hidden />}
                  <span className="flex-1">
                    <span className="block font-semibold leading-snug">{r.title}</span>
                    <span className="text-xs text-ink-muted">{r.kind === 'plan' ? 'Planeación' : 'Idea de Happy'}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card flex items-center gap-3 px-4 py-4 text-ink-soft">
            <HappyAvatar size={36} />
            <p className="text-sm">
              Aún no tienes trabajo guardado. Empieza con{' '}
              <Link href={happyHref} className="font-semibold text-happy hover:underline">
                Happy
              </Link>{' '}
              o guarda una experiencia de la malla.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
