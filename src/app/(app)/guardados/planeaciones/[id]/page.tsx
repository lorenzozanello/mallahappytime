import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deletePlan } from '@/app/actions/workspace';
import { DeleteButton } from '@/components/workspace/DeleteButton';
import { PlanEditor } from '@/components/workspace/PlanEditor';
import { requireSession } from '@/lib/auth/session';
import { getExperienceById, getLevel } from '@/lib/curriculum';

export const metadata = { title: 'Planeación' };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, repo } = await requireSession();
  const plan = await repo.getPlan(profile.id, id);
  if (!plan) notFound();
  const exp = plan.experienceId ? getExperienceById(plan.experienceId) : undefined;
  const level = exp ? getLevel(exp.levelId) : plan.levelId ? getLevel(plan.levelId) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/guardados?tab=planeaciones" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Planeaciones
        </Link>
        <DeleteButton action={deletePlan.bind(null, plan.id)} confirmText="¿Eliminar esta planeación? No se puede deshacer." />
      </div>
      <PlanEditor
        id={plan.id}
        initialTitle={plan.title}
        initialContent={plan.content}
        context={{ levelId: exp?.levelId ?? plan.levelId ?? undefined, period: exp?.period ?? plan.period ?? undefined, experienceId: exp?.id }}
        contextLabel={level ? [level.name, exp?.periodLabel, exp ? `«${exp.title}»` : null].filter(Boolean).join(' · ') : null}
      />
    </div>
  );
}
