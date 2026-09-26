import { ChevronDown } from 'lucide-react';
import { getChunk, getLevel, getPrinciples } from '@/lib/curriculum';
import { buildQuickView, type QuickSection } from '@/lib/curriculum/quick-view';
import { EXPERIENCE_FIELDS, type ExperienceFieldKey } from '@/lib/curriculum/sections';
import { capitalize, splitItems } from '@/lib/curriculum/text';
import type { CurriculumExperience } from '@/lib/curriculum/types';
import { SourceBadge } from './SourceBadge';

const QUICK_ACCENT: Record<QuickSection['key'], string> = {
  buscamos: 'bg-brand',
  vivirlo: 'bg-sun',
  observar: 'bg-official',
  participacion: 'bg-[#1ec8f0]',
  familias: 'bg-happy',
};

export function QuickView({ experience }: { experience: CurriculumExperience }) {
  const sections = buildQuickView(experience);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <SourceBadge type="institutional" />
        <span>Fragmentos textuales de la malla, organizados para leer rápido.</span>
      </div>
      {sections.map((s) => (
        <section key={s.key} className="card p-5" aria-labelledby={`qv-${s.key}`}>
          <div className="mb-3 flex items-center gap-2.5">
            <span aria-hidden className={`h-5 w-1.5 rounded-full ${QUICK_ACCENT[s.key]}`} />
            <h3 id={`qv-${s.key}`} className="text-lg font-bold leading-tight">
              {s.title}
            </h3>
          </div>
          {s.lead && <p className="mb-3 text-ink-soft">{s.lead.text}</p>}
          <ul className="space-y-2">
            {s.bullets.map((b) => (
              <li key={b.text} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">De: {s.sourceLabel}</p>
        </section>
      ))}
    </div>
  );
}

function field(key: ExperienceFieldKey) {
  return EXPERIENCE_FIELDS.find((f) => f.key === key)!;
}

function SourceLine({ id }: { id: string }) {
  const chunk = getChunk(id);
  if (!chunk) return null;
  return (
    <p className="mt-2 text-[0.72rem] text-ink-muted">
      Fuente: {chunk.sourceReference.sheet}!{chunk.sourceReference.cell} · <span className="font-mono">{chunk.id}</span>
    </p>
  );
}

function FieldBlock({ e, k, asList, anchor }: { e: CurriculumExperience; k: ExperienceFieldKey; asList?: boolean; anchor?: string }) {
  const def = field(k);
  const items = asList ? splitItems(e.fields[k], def.split) : [];
  return (
    <div id={anchor ?? k} className="scroll-mt-24 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-1.5 font-bold">{def.label}</h4>
      {asList && items.length > 1 ? (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />
              <span>{capitalize(i)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft">{e.fields[k]}</p>
      )}
      <SourceLine id={`${e.id}-${def.code}`} />
    </div>
  );
}

function Group({ title, id, children, open }: { title: string; id: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="card group scroll-mt-24 overflow-hidden">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-line px-5 py-5">{children}</div>
    </details>
  );
}

const ACTIVITIES = [
  { key: 'juego', label: 'Juego' },
  { key: 'exploracion', label: 'Exploración del medio' },
  { key: 'literatura', label: 'Literatura' },
  { key: 'arte', label: 'Arte' },
] as const;

/** Complete curricular record: every workbook field, organized with progressive disclosure. */
export function FullView({ experience: e }: { experience: CurriculumExperience }) {
  const level = getLevel(e.levelId)!;
  const alertPrinciple = getPrinciples().find((p) => p.content.startsWith('Las alertas no son diagnósticos'));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <SourceBadge type="institutional" />
        <span>Ficha curricular completa, tal como aparece en la malla.</span>
      </div>

      <Group title="Identidad y alcance" id="identidad" open>
        <FieldBlock e={e} k="alcance" />
        <div className="border-t border-line pt-4 text-sm text-ink-soft">
          <p>
            <strong className="text-ink">{level.name}</strong> · {level.cycle} · Equivalencia: {level.equivalence} · Edad aproximada: {level.entryAge} a{' '}
            {level.exitAge}
          </p>
          <p className="mt-1">
            {e.periodLabel} ({e.periodCode})
          </p>
        </div>
      </Group>

      <Group title="Propósitos esenciales" id="propositos">
        {e.purposes.map((p, i) => (
          <div key={p.number} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
            <p className="text-sm font-semibold text-ink-muted">
              {p.number}. {p.statement}
            </p>
            <p className="mt-1.5">{p.realization}</p>
            <SourceLine id={`${e.id}-PROP-0${i + 1}`} />
          </div>
        ))}
      </Group>

      <Group title="Momentos pedagógicos" id="momentos">
        <FieldBlock e={e} k="indagar" />
        <FieldBlock e={e} k="proyectar" />
        <FieldBlock e={e} k="vivir" />
        <FieldBlock e={e} k="valorar" />
      </Group>

      <Group title="Actividades rectoras" id="actividades-rectoras">
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIVITIES.map((a) => {
            const act = e.activities[a.key];
            return (
              <div key={a.key} id={a.key} className="scroll-mt-24 rounded-xl border border-line p-4">
                <h4 className="mb-2 font-bold">{a.label}</h4>
                <dl className="space-y-1.5 text-sm">
                  {(
                    [
                      ['Tema', act.tema],
                      ['Competencia', act.competencia],
                      ['Avance', act.avance],
                      ['Evidencia', act.evidencia],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="inline font-semibold">{k}: </dt>
                      <dd className="inline text-ink-soft">{v}</dd>
                    </div>
                  ))}
                </dl>
                <SourceLine id={`${e.id}-${field(a.key).code}`} />
              </div>
            );
          })}
        </div>
      </Group>

      <Group title="Saberes y desarrollo" id="saberes-desarrollo">
        <FieldBlock e={e} k="nucleos" asList />
        <FieldBlock e={e} k="saberes" asList />
        <FieldBlock e={e} k="competencias" asList />
        <FieldBlock e={e} k="procesos" asList />
        <FieldBlock e={e} k="indicadores" asList />
      </Group>

      <Group title="Contexto, cuidado y ambientes" id="contexto">
        <FieldBlock e={e} k="caribe" />
        <FieldBlock e={e} k="gire" />
        <FieldBlock e={e} k="ambientes" />
      </Group>

      <Group title="Desarrollo emocional y relacional" id="emocional-grupo">
        <FieldBlock e={e} k="emocional" asList />
      </Group>

      <Group title="Participación (DUA y apoyos)" id="participacion">
        <FieldBlock e={e} k="dua" asList />
      </Group>

      <Group title="Familias" id="familias">
        <FieldBlock e={e} k="familia" asList />
      </Group>

      <Group title="Observación, documentación y valoración" id="observacion-grupo">
        <FieldBlock e={e} k="evidencias" asList />
        <div id="documentacion" className="scroll-mt-24 border-t border-line pt-4">
          <h4 className="mb-1.5 font-bold">Documentación pedagógica</h4>
          <p className="text-ink-soft">{e.documentation.documentacion}</p>
          <SourceLine id={`${e.id}-DOC`} />
        </div>
        <div id="alertas" className="scroll-mt-24 rounded-xl border border-warn-soft bg-warn-soft/50 p-4">
          <h4 className="mb-1.5 font-bold">Alertas</h4>
          <p className="text-ink-soft">{e.documentation.alertas}</p>
          {alertPrinciple && <p className="mt-2 text-sm font-semibold text-warn">Principio institucional: {alertPrinciple.content}</p>}
          <SourceLine id={`${e.id}-ALR`} />
        </div>
        <FieldBlock e={e} k="observacion" />
      </Group>
    </div>
  );
}
