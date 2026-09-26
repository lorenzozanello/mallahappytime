'use client';

import { AlertTriangle, ArrowRight, BookOpen, ChevronDown, Info, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import type { HappyItem, HappyNotice, HappyOption, HappyTurn, SourceRef } from '@/lib/happy/schema';

export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-[36px] cursor-pointer list-none items-center gap-1 text-sm font-semibold text-official [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4" aria-hidden /> Ver en la malla ({sources.length})
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <li key={s.sourceId}>
            <SourceCard source={s} />
          </li>
        ))}
      </ul>
    </details>
  );
}

export function SourceCard({ source, why }: { source: SourceRef; why?: string | null }) {
  return (
    <div className="rounded-xl border border-official/20 bg-official-soft/50 p-3">
      <p className="text-[0.8rem] font-semibold text-official">
        {source.sectionLabel}
        {source.levelPeriod && <span className="font-normal text-ink-muted"> · {source.levelPeriod}</span>}
      </p>
      {source.experienceTitle && <p className="text-sm font-semibold">{source.experienceTitle}</p>}
      <blockquote className="mt-1 border-l-2 border-official/40 pl-2 text-sm text-ink-soft">{source.excerpt}</blockquote>
      {why && (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-happy">Relación (según Happy): </span>
          {why}
        </p>
      )}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.68rem] text-ink-muted">{source.sourceId}</span>
        {source.href && (
          <Link href={source.href} className="inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-official hover:underline">
            Abrir <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

function ItemView({ item }: { item: HappyItem }) {
  return (
    <li className={`rounded-lg border-l-4 py-1.5 pl-3 ${item.sourceType === 'institutional' ? 'border-official' : 'border-dashed border-happy/60'}`}>
      <SourceBadge type={item.sourceType} compact />
      <p className="mt-1">{item.text}</p>
      <SourceList sources={item.sources} />
    </li>
  );
}

export function Notices({ notices }: { notices: HappyNotice[] }) {
  if (!notices.length) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <p
          key={n.text}
          role={n.kind === 'info' ? 'status' : 'alert'}
          className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${n.kind === 'safety' ? 'bg-brand-soft text-brand-strong' : n.kind === 'warning' ? 'bg-warn-soft text-warn' : 'bg-[#eef2f7] text-[#334155]'}`}
        >
          {n.kind === 'safety' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : n.kind === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          {n.text}
        </p>
      ))}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="eyebrow mb-2">{children}</h3>;
}

export function OptionCard({ option, onDevelop, disabled }: { option: HappyOption; onDevelop?: (o: HappyOption) => void; disabled?: boolean }) {
  return (
    <li className={`card p-4 ${option.sourceType === 'institutional' ? 'border-l-4 border-l-official' : 'border-l-4 border-dashed border-l-happy/60'}`}>
      <SourceBadge type={option.sourceType} />
      <h4 className="mt-2 text-lg font-bold leading-snug">{option.title}</h4>
      <p className="mt-1 text-ink-soft">{option.text}</p>
      <SourceList sources={option.sources} />
      {onDevelop && (
        <button type="button" onClick={() => onDevelop(option)} disabled={disabled} className="btn btn-secondary mt-3 w-full sm:w-auto">
          Desarrollar este camino <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

export interface TurnLike {
  stage: HappyTurn['stage'];
  understanding: string;
  options: HappyOption[];
  development: { title: string; sections: { key: string; heading: string; items: HappyItem[] }[] } | null;
  curriculumLinks: (SourceRef & { why: string | null })[];
  insufficientEvidence: boolean;
  nextStep: string;
  notices: HappyNotice[];
}

/** Structured rendering of a Happy turn. The UI, not the model, controls presentation. */
export function HappyTurnView({ turn, onDevelop, busy }: { turn: TurnLike; onDevelop?: (o: HappyOption) => void; busy?: boolean }) {
  return (
    <div className="space-y-5">
      <Notices notices={turn.notices} />
      {turn.understanding && (
        <section>
          <Heading>Lo que entiendo</Heading>
          <p className="text-[1.02rem]">{turn.understanding}</p>
        </section>
      )}
      {turn.insufficientEvidence && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          La malla no trae información suficiente sobre esto. Lo que Happy proponga aquí son ideas complementarias, no contenido institucional.
        </p>
      )}
      {turn.options.length > 0 && (
        <section>
          <Heading>Caminos posibles</Heading>
          <ul className="space-y-3">
            {turn.options.map((o) => (
              <OptionCard key={o.title} option={o} onDevelop={turn.stage === 'caminos' ? onDevelop : undefined} disabled={busy} />
            ))}
          </ul>
        </section>
      )}
      {turn.development && (
        <section>
          <Heading>Desarrollo</Heading>
          <h4 className="mb-3 text-xl font-extrabold leading-snug">{turn.development.title}</h4>
          <div className="space-y-4">
            {turn.development.sections.map((s) => (
              <div key={s.key}>
                <h5 className="mb-1.5 font-bold">{s.heading}</h5>
                <ul className="space-y-2">
                  {s.items.map((i) => (
                    <ItemView key={i.text} item={i} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {turn.curriculumLinks.length > 0 && (
        <section>
          <Heading>Conexión con nuestra malla</Heading>
          <ul className="space-y-2">
            {turn.curriculumLinks.map((l) => (
              <li key={l.sourceId}>
                <SourceCard source={l} why={l.why} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {turn.nextStep && (
        <section>
          <Heading>Siguiente paso</Heading>
          <p className="font-medium">{turn.nextStep}</p>
        </section>
      )}
    </div>
  );
}
