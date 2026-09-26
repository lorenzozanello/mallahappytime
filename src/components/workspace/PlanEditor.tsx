'use client';

import { Check, Loader2, Plus, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { savePlan } from '@/app/actions/workspace';
import { HappyAvatar } from '@/components/brand/Happy';
import { SourceBadge } from '@/components/curriculum/SourceBadge';
import { Notices, SourceList } from '@/components/happy/HappyTurnView';
import { hrefForSourceId } from '@/lib/curriculum/ids';
import type { FieldAssistResult, HappyItem } from '@/lib/happy/schema';
import { PLANNING_FIELDS, type PlanningContent, type PlanningFieldKey } from '@/lib/workspace/types';

type AssistField = Exclude<PlanningFieldKey, 'notes'>;

const ASSIST_LABEL: Record<AssistField, string> = {
  intention: 'Ayúdame con la intención',
  provocation: 'Ayúdame con el inicio',
  development: 'Ayúdame con el desarrollo',
  questions: 'Ayúdame con preguntas',
  materials: 'Ayúdame con materiales',
  participation: 'Ayúdame con alternativas',
  observe: 'Ayúdame con qué observar',
};

export interface PlanEditorProps {
  id: string;
  initialTitle: string;
  initialContent: PlanningContent;
  context: { levelId?: string; period?: number; experienceId?: string };
  contextLabel: string | null;
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string } | { kind: 'error'; message: string };

export function PlanEditor({ id, initialTitle, initialContent, context, contextLabel }: PlanEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<PlanningContent>(initialContent);
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [assist, setAssist] = useState<Partial<Record<AssistField, { loading: boolean; result?: FieldAssistResult; error?: string }>>>({});
  const latest = useRef({ title, content });
  latest.current = { title, content };

  const persist = useCallback(async () => {
    setSave({ kind: 'saving' });
    const res = await savePlan({ id, title: latest.current.title, content: latest.current.content });
    if (res.ok) {
      setDirty(false);
      setSave({ kind: 'saved', at: new Date(res.updatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) });
    } else {
      setSave({ kind: 'error', message: res.error });
    }
  }, [id]);

  // Autosave shortly after the teacher stops typing.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void persist(), 1500);
    return () => clearTimeout(t);
  }, [dirty, title, content, persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function update(field: PlanningFieldKey, value: string) {
    setContent((c) => ({ ...c, [field]: value }));
    setDirty(true);
  }

  async function requestAssist(field: AssistField) {
    setAssist((a) => ({ ...a, [field]: { loading: true } }));
    try {
      const draft: Record<string, string> = {};
      for (const f of PLANNING_FIELDS) draft[f.key] = content[f.key];
      const res = await fetch('/api/happy/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, planTitle: title, draft, context }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? 'Happy no respondió.');
      setAssist((a) => ({ ...a, [field]: { loading: false, result: data as FieldAssistResult } }));
    } catch (err) {
      setAssist((a) => ({ ...a, [field]: { loading: false, error: err instanceof Error ? err.message : 'Error' } }));
    }
  }

  function addSuggestion(field: AssistField, item: HappyItem) {
    const tag = item.sourceType === 'institutional' ? `[Malla ${item.sources.map((s) => s.sourceId).join(', ')}]` : '[Idea de Happy]';
    const line = `• ${item.text} ${tag}`;
    update(field, content[field] ? `${content[field]}\n${line}` : line);
    const newConnections = item.sources
      .filter((s) => !content.connections.some((c) => c.sourceId === s.sourceId))
      .map((s) => ({ sourceId: s.sourceId, label: [s.levelPeriod, s.sectionLabel].filter(Boolean).join(' · ') }));
    if (newConnections.length) setContent((c) => ({ ...c, connections: [...c.connections, ...newConnections] }));
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-20 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur print:hidden">
        <p className="text-sm text-ink-muted" role="status" aria-live="polite">
          {save.kind === 'saving' && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Guardando…
            </span>
          )}
          {save.kind === 'saved' && !dirty && (
            <span className="inline-flex items-center gap-1 text-official">
              <Check className="h-4 w-4" aria-hidden /> Guardado {save.at}
            </span>
          )}
          {save.kind === 'error' && <span className="text-danger">No se guardó: {save.message}</span>}
          {dirty && save.kind !== 'saving' && 'Cambios sin guardar'}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()} aria-label="Imprimir planeación">
            <Printer className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void persist()} disabled={save.kind === 'saving'}>
            Guardar
          </button>
        </div>
      </div>

      <label className="block">
        <span className="eyebrow">Título</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          maxLength={280}
          className="field mt-1 text-xl font-bold"
          aria-label="Título de la planeación"
        />
      </label>
      {contextLabel && <p className="-mt-2 text-sm text-ink-muted">{contextLabel}</p>}
      {content.origin && <p className="rounded-lg bg-happy-soft/60 px-3 py-2 text-sm text-ink-soft">{content.origin}</p>}

      {PLANNING_FIELDS.map((f) => {
        const a = f.key !== 'notes' ? assist[f.key as AssistField] : undefined;
        return (
          <section key={f.key} className="card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`in-${f.key}`} className="font-bold">
                {f.label}
                <span className="block text-xs font-normal text-ink-muted">{f.hint}</span>
              </label>
              {f.key !== 'notes' && (
                <button type="button" className="btn btn-ghost min-h-[40px] px-2 text-sm text-happy print:hidden" onClick={() => void requestAssist(f.key as AssistField)} disabled={a?.loading}>
                  <HappyAvatar size={20} />
                  {a?.loading ? 'Pensando…' : ASSIST_LABEL[f.key as AssistField]}
                </button>
              )}
            </div>
            <textarea
              id={`in-${f.key}`}
              value={content[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              rows={f.key === 'development' ? 6 : 3}
              maxLength={6000}
              className="field resize-y leading-relaxed"
            />
            {a?.error && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {a.error}
              </p>
            )}
            {a?.result && (
              <div className="mt-3 space-y-2 rounded-xl border border-happy/20 bg-happy-soft/40 p-3 print:hidden">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-happy">Sugerencias de Happy {a.result.meta.route === 'mock' && '(simuladas)'}</p>
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-surface" aria-label="Cerrar sugerencias" onClick={() => setAssist((s) => ({ ...s, [f.key]: undefined }))}>
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <Notices notices={a.result.notices} />
                {a.result.items.length === 0 && !a.result.notices.length && <p className="text-sm text-ink-soft">Happy no encontró sugerencias para este campo.</p>}
                <ul className="space-y-2">
                  {a.result.items.map((item) => (
                    <li key={item.text} className="rounded-lg bg-surface p-3">
                      <SourceBadge type={item.sourceType} compact />
                      <p className="mt-1 text-sm">{item.text}</p>
                      <SourceList sources={item.sources} />
                      <button type="button" className="btn btn-secondary mt-2 min-h-[40px] text-sm" onClick={() => addSuggestion(f.key as AssistField, item)}>
                        <Plus className="h-4 w-4" aria-hidden /> Añadir
                      </button>
                    </li>
                  ))}
                </ul>
                {a.result.note && <p className="text-xs text-ink-muted">{a.result.note}</p>}
              </div>
            )}
          </section>
        );
      })}

      <section className="card p-4" aria-labelledby="conexiones">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 id="conexiones" className="font-bold">
            Conexiones curriculares
          </h2>
          <SourceBadge type="institutional" />
        </div>
        {content.connections.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin conexiones aún. Las sugerencias de Happy basadas en la malla las añaden aquí.</p>
        ) : (
          <ul className="space-y-1.5">
            {content.connections.map((c) => (
              <li key={c.sourceId} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-ink-muted">{c.sourceId}</span>
                {hrefForSourceId(c.sourceId) ? (
                  <Link href={hrefForSourceId(c.sourceId)!} className="flex-1 font-medium text-official hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="flex-1">{c.label}</span>
                )}
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-canvas print:hidden"
                  aria-label={`Quitar conexión ${c.sourceId}`}
                  onClick={() => {
                    setContent((s) => ({ ...s, connections: s.connections.filter((x) => x.sourceId !== c.sourceId) }));
                    setDirty(true);
                  }}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
