import { updateActiveContext } from '@/app/actions/workspace';
import type { CurriculumLevel } from '@/lib/curriculum/types';

const PERIODS = [
  { n: 1, label: 'Periodo I' },
  { n: 2, label: 'Periodo II' },
  { n: 3, label: 'Periodo III' },
  { n: 4, label: 'Periodo IV' },
];

/** Choose active level and period (the malla has no calendar dates, so the teacher decides). */
export function ContextPicker({
  levels,
  levelId,
  period,
  next = '/',
  askName,
  displayName,
}: {
  levels: CurriculumLevel[];
  levelId?: string | null;
  period?: number | null;
  next?: string;
  askName?: boolean;
  displayName?: string;
}) {
  return (
    <form action={updateActiveContext} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {askName && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-soft">¿Cómo te llamamos?</span>
          <input name="displayName" defaultValue={displayName} className="field" maxLength={80} autoComplete="given-name" />
        </label>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Nivel</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {levels.map((l) => (
            <label key={l.id} className="relative">
              <input type="radio" name="levelId" value={l.id} defaultChecked={l.id === levelId} required className="peer sr-only" />
              <span className="flex min-h-[56px] cursor-pointer flex-col justify-center rounded-xl border border-line-strong bg-surface px-3 py-2 peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                <span className="font-bold">{l.name}</span>
                <span className="text-xs text-ink-muted">
                  {l.equivalence} · {l.entryAge}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Periodo</legend>
        <div className="grid grid-cols-4 gap-2">
          {PERIODS.map((p) => (
            <label key={p.n}>
              <input type="radio" name="period" value={p.n} defaultChecked={p.n === period} required className="peer sr-only" />
              <span className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        Guardar
      </button>
    </form>
  );
}
