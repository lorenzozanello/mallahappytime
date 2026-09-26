import { ArrowRight, Bookmark, FilePlus2, FileText, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { createBlankPlan, deleteSavedItem } from '@/app/actions/workspace';
import { HappyAvatar } from '@/components/brand/Happy';
import { DeleteButton } from '@/components/workspace/DeleteButton';
import { requireSession } from '@/lib/auth/session';
import { getExperienceById, getLevel } from '@/lib/curriculum';

export const metadata = { title: 'Guardados' };

const TABS = [
  { key: 'favoritos', label: 'Favoritos', Icon: Bookmark },
  { key: 'ideas', label: 'Ideas de Happy', Icon: Lightbulb },
  { key: 'planeaciones', label: 'Planeaciones', Icon: FileText },
] as const;

function when(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default async function GuardadosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { profile, repo } = await requireSession();
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? 'favoritos';
  const [favorites, ideas, plans] = await Promise.all([repo.listSaved(profile.id, 'favorite'), repo.listSaved(profile.id, 'happy_idea'), repo.listPlans(profile.id)]);
  const counts = { favoritos: favorites.length, ideas: ideas.length, planeaciones: plans.length };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Guardados</h1>
      <nav aria-label="Secciones de guardados" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/guardados?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`flex min-h-[48px] flex-col items-center justify-center rounded-lg px-1 text-center text-[0.8rem] font-bold leading-tight sm:flex-row sm:gap-1.5 sm:text-sm ${tab === t.key ? 'bg-brand-soft text-brand' : 'text-ink-soft'}`}
          >
            <span>{t.label}</span>
            <span className="text-xs font-semibold opacity-70">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {tab === 'favoritos' && (
        <section aria-label="Favoritos" className="space-y-2">
          {favorites.length === 0 && <Empty text="Guarda experiencias de la malla para tenerlas a mano." href="/malla" cta="Ir a la malla" />}
          {favorites.map((f) => {
            const exp = f.experienceId ? getExperienceById(f.experienceId) : undefined;
            const level = exp ? getLevel(exp.levelId) : undefined;
            return (
              <div key={f.id} className="card flex items-center gap-2 p-2 pl-4">
                <Link href={exp ? `/malla/${exp.levelId}/${exp.period}` : '/malla'} className="flex min-h-[52px] flex-1 flex-col justify-center">
                  <span className="font-semibold leading-snug">{exp?.title ?? f.title}</span>
                  <span className="text-xs text-ink-muted">{[level?.name, exp?.periodLabel].filter(Boolean).join(' · ')}</span>
                </Link>
                <DeleteButton action={deleteSavedItem.bind(null, f.id)} label="Quitar" confirmText="¿Quitar esta experiencia de favoritos?" />
              </div>
            );
          })}
        </section>
      )}

      {tab === 'ideas' && (
        <section aria-label="Ideas de Happy" className="space-y-2">
          {ideas.length === 0 && <Empty text="Cuando una respuesta de Happy te sirva, guárdala y aparecerá aquí." href="/happy" cta="Abrir Happy" happy />}
          {ideas.map((i) => (
            <Link key={i.id} href={`/guardados/ideas/${i.id}`} className="card flex min-h-[64px] items-center gap-3 px-4 py-3 hover:border-line-strong">
              <Lightbulb className="h-5 w-5 shrink-0 text-happy" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold leading-snug">{i.title}</span>
                <span className="text-xs text-ink-muted">
                  {when(i.createdAt)}
                  {i.experienceId && ` · ${getExperienceById(i.experienceId)?.title ?? ''}`}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </section>
      )}

      {tab === 'planeaciones' && (
        <section aria-label="Planeaciones" className="space-y-2">
          <form action={createBlankPlan}>
            <button type="submit" className="btn btn-primary w-full sm:w-auto">
              <FilePlus2 className="h-4 w-4" aria-hidden /> Nueva planeación
            </button>
          </form>
          {plans.length === 0 && <Empty text="Crea una planeación desde una experiencia, una idea de Happy o en blanco." />}
          {plans.map((p) => (
            <Link key={p.id} href={`/guardados/planeaciones/${p.id}`} className="card flex min-h-[64px] items-center gap-3 px-4 py-3 hover:border-line-strong">
              <FileText className="h-5 w-5 shrink-0 text-brand" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold leading-snug">{p.title}</span>
                <span className="text-xs text-ink-muted">
                  Editada {when(p.updatedAt)}
                  {p.experienceId && ` · ${getExperienceById(p.experienceId)?.title ?? ''}`}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function Empty({ text, href, cta, happy }: { text: string; href?: string; cta?: string; happy?: boolean }) {
  return (
    <div className="card flex flex-col items-start gap-3 p-5 text-ink-soft">
      <p>{text}</p>
      {href && cta && (
        <Link href={href} className="btn btn-secondary">
          {happy && <HappyAvatar size={22} />} {cta}
        </Link>
      )}
    </div>
  );
}
