import { ChevronLeft, FilePlus2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPlanFromIdea, deleteSavedItem } from '@/app/actions/workspace';
import { HappyAvatar, HappyName } from '@/components/brand/Happy';
import { HappyTurnView } from '@/components/happy/HappyTurnView';
import { DeleteButton } from '@/components/workspace/DeleteButton';
import { requireSession } from '@/lib/auth/session';
import { getExperienceById } from '@/lib/curriculum';
import { rehydrateIdea } from '@/lib/happy/saved-idea';

export const metadata = { title: 'Idea de Happy' };

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, repo } = await requireSession();
  const saved = await repo.getSaved(profile.id, id);
  if (!saved || saved.kind !== 'happy_idea') notFound();
  const idea = rehydrateIdea(saved.payload);
  const exp = saved.experienceId ? getExperienceById(saved.experienceId) : undefined;
  const remove = async () => {
    'use server';
    await deleteSavedItem(id);
    const { redirect } = await import('next/navigation');
    redirect('/guardados?tab=ideas');
  };

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <Link href="/guardados?tab=ideas" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Ideas de Happy
      </Link>
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <HappyAvatar size={24} /> Idea guardada de <HappyName /> · {new Date(saved.createdAt).toLocaleDateString('es-CO')}
        </p>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{saved.title}</h1>
        {exp && <p className="text-sm text-ink-soft">Experiencia: {exp.title}</p>}
      </header>
      {!idea ? (
        <p className="card p-5 text-ink-soft">Esta idea no se puede mostrar porque su formato no es válido.</p>
      ) : (
        <>
          <div className="card p-4">
            <p className="eyebrow mb-1">Tu mensaje</p>
            <p>{idea.payload.message}</p>
          </div>
          {idea.simulated && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Esta idea se generó con el modelo de prueba (respuesta simulada).</p>}
          <div className="card p-4 sm:p-5">
            <HappyTurnView
              turn={{
                stage: idea.development ? 'desarrollo' : 'conexion',
                understanding: idea.understanding,
                options: idea.options,
                development: idea.development,
                curriculumLinks: idea.curriculumLinks,
                insufficientEvidence: false,
                nextStep: '',
                notices: [],
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={createPlanFromIdea.bind(null, saved.id)}>
              <button type="submit" className="btn btn-primary">
                <FilePlus2 className="h-4 w-4" aria-hidden /> Convertir en planeación
              </button>
            </form>
            {exp && (
              <Link href={`/happy?nivel=${exp.levelId}&periodo=${exp.period}&modo=${idea.payload.mode}`} className="btn btn-secondary">
                <HappyAvatar size={22} /> Seguir con Happy
              </Link>
            )}
            <DeleteButton action={remove} confirmText="¿Eliminar esta idea guardada?" />
          </div>
        </>
      )}
    </article>
  );
}
