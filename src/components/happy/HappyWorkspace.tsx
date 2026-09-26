'use client';

import { Bookmark, BookmarkCheck, FilePlus2, Loader2, SendHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createPlanFromIdea, saveHappyIdea } from '@/app/actions/workspace';
import { HappyAvatar, HappyName } from '@/components/brand/Happy';
import type { EnabledModeKey } from '@/lib/happy/modes';
import type { HappyOption, HappyRequest, HappyTurn } from '@/lib/happy/schema';
import { HappyTurnView } from './HappyTurnView';

export interface HappyModeInfo {
  key: EnabledModeKey;
  label: string;
  tagline: string;
  placeholder: string;
  starters: string[];
}

export interface HappyContextInfo {
  levelId?: string;
  period?: number;
  experienceId?: string;
  label: string | null;
  experienceTitle: string | null;
}

type Entry =
  | { kind: 'teacher'; id: string; text: string; developing?: string }
  | { kind: 'happy'; id: string; turn: HappyTurn; request: HappyRequest; savedId?: string; feedback?: 'useful' | 'not_useful' }
  | { kind: 'error'; id: string; text: string; retry: HappyRequest };

let seq = 0;
const nextId = () => `e${++seq}`;

function summarize(turn: HappyTurn): string {
  const parts = [turn.understanding];
  if (turn.options.length) parts.push(`Caminos: ${turn.options.map((o) => o.title).join(' / ')}`);
  if (turn.development) parts.push(`Desarrollo: ${turn.development.title}`);
  return parts.filter(Boolean).join('. ').slice(0, 1000);
}

export function HappyWorkspace({
  modes,
  initialMode,
  context,
  initialMessage,
}: {
  modes: HappyModeInfo[];
  initialMode: EnabledModeKey;
  context: HappyContextInfo;
  initialMessage?: string;
}) {
  const [mode, setMode] = useState<EnabledModeKey>(initialMode);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState(initialMessage ?? '');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const current = modes.find((m) => m.key === mode)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries, busy]);

  const history = (): HappyRequest['history'] =>
    entries
      .flatMap((e): HappyRequest['history'] =>
        e.kind === 'teacher' ? [{ role: 'teacher', text: e.text }] : e.kind === 'happy' ? [{ role: 'happy', text: summarize(e.turn) }] : [],
      )
      .slice(-8);

  async function send(request: HappyRequest) {
    setBusy(true);
    try {
      const res = await fetch('/api/happy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? 'Happy no respondió. Intenta de nuevo.');
      setEntries((prev) => [...prev, { kind: 'happy', id: nextId(), turn: data as HappyTurn, request }]);
    } catch (err) {
      setEntries((prev) => [...prev, { kind: 'error', id: nextId(), text: err instanceof Error ? err.message : 'Error inesperado', retry: request }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const request: HappyRequest = {
      mode,
      message,
      context: { levelId: context.levelId as HappyRequest['context']['levelId'], period: context.period, experienceId: context.experienceId },
      history: history(),
    };
    setEntries((prev) => [...prev, { kind: 'teacher', id: nextId(), text: message }]);
    setDraft('');
    void send(request);
  }

  function develop(from: HappyRequest, option: HappyOption) {
    const request: HappyRequest = {
      ...from,
      message: `Quiero desarrollar el camino «${option.title}».`,
      history: history(),
      selectedOption: { title: option.title, description: option.text, sourceType: option.sourceType === 'institutional' ? 'institutional' : 'generated', sourceIds: option.sources.map((s) => s.sourceId) },
    };
    setEntries((prev) => [...prev, { kind: 'teacher', id: nextId(), text: `Desarrollemos: ${option.title}`, developing: option.title }]);
    void send(request);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <header className="mb-4 flex items-start gap-3">
        <HappyAvatar size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl leading-tight">
            <HappyName />
          </h1>
          <p className="text-sm text-ink-muted">Asistente curricular de Happy Time</p>
        </div>
      </header>

      <div className="mb-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm" aria-live="polite">
        {context.label ? (
          <p>
            <span className="text-ink-muted">Trabajando en: </span>
            <span className="font-semibold">{context.label}</span>
            {context.experienceTitle && <span className="font-semibold"> · «{context.experienceTitle}»</span>}{' '}
            <Link href="/perfil#contexto" className="ml-1 font-semibold text-brand hover:underline">
              Cambiar
            </Link>
          </p>
        ) : (
          <p>
            Sin experiencia seleccionada.{' '}
            <Link href="/perfil#contexto" className="font-semibold text-brand hover:underline">
              Elige nivel y periodo
            </Link>{' '}
            para que Happy conozca tu contexto.
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label="Modo de Happy" className="mb-5 grid grid-cols-3 gap-1.5">
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            onClick={() => setMode(m.key)}
            className={`flex min-h-[64px] flex-col items-start justify-center rounded-xl border px-3 py-2 text-left ${mode === m.key ? 'border-happy bg-happy-soft' : 'border-line bg-surface hover:border-line-strong'}`}
          >
            <span className={`font-bold ${mode === m.key ? 'text-happy' : ''}`}>{m.label}</span>
            <span className="text-xs leading-snug text-ink-muted">{m.tagline}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5 pb-44 md:pb-36">
        {entries.length === 0 && (
          <section className="card p-5">
            <p className="text-lg font-semibold">Una compañera para pensar, conectar y aterrizar experiencias.</p>
            <p className="mt-1 text-sm text-ink-muted">La docente conduce. Happy amplía posibilidades.</p>
            <p className="mt-4 text-sm font-semibold text-ink-soft">Puedes empezar con:</p>
            <ul className="mt-2 space-y-2">
              {current.starters.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => submit(s)} className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-left text-sm hover:border-happy">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entries.map((e) =>
          e.kind === 'teacher' ? (
            <div key={e.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">{e.text}</p>
            </div>
          ) : e.kind === 'error' ? (
            <div key={e.id} role="alert" className="rounded-xl bg-warn-soft p-4 text-warn">
              <p className="font-semibold">{e.text}</p>
              <button type="button" className="btn btn-secondary mt-2" onClick={() => void send(e.retry)} disabled={busy}>
                Reintentar
              </button>
            </div>
          ) : (
            <HappyEntry
              key={e.id}
              entry={e}
              busy={busy}
              onDevelop={(o) => develop(e.request, o)}
              onSaved={(savedId) => setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, savedId } : x)) as Entry[])}
              onFeedback={(fb) => setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, feedback: fb } : x)) as Entry[])}
            />
          ),
        )}

        {busy && (
          <div className="flex items-center gap-3 text-ink-soft" role="status">
            <HappyAvatar size={32} />
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Buscando en la malla y pensando caminos…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          submit(draft);
        }}
        className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <label htmlFor="happy-input" className="sr-only">
            Mensaje para Happy
          </label>
          <textarea
            id="happy-input"
            ref={inputRef}
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                submit(draft);
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={current.placeholder}
            className="field max-h-40 min-h-[52px] flex-1 resize-none"
          />
          <button type="submit" className="btn btn-happy h-[52px] w-[52px] shrink-0 p-0" disabled={busy || !draft.trim()} aria-label="Enviar a Happy">
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function HappyEntry({
  entry,
  busy,
  onDevelop,
  onSaved,
  onFeedback,
}: {
  entry: Extract<Entry, { kind: 'happy' }>;
  busy: boolean;
  onDevelop: (o: HappyOption) => void;
  onSaved: (id: string) => void;
  onFeedback: (fb: 'useful' | 'not_useful') => void;
}) {
  const { turn, request } = entry;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canSave = turn.meta.grounding === 'model' && (turn.options.length > 0 || turn.development || turn.curriculumLinks.length > 0);

  function save() {
    start(async () => {
      try {
        setError(null);
        const { id } = await saveHappyIdea({
          mode: request.mode,
          message: request.message,
          context: request.context,
          selectedOptionTitle: request.selectedOption?.title,
          turn,
        });
        onSaved(id);
        if (turn.eventId) void sendFeedback(turn.eventId, entry.feedback ?? 'useful', 'saved');
      } catch {
        setError('No se pudo guardar. Intenta de nuevo.');
      }
    });
  }

  async function sendFeedback(eventId: string, rating: 'useful' | 'not_useful', nextAction?: 'saved' | 'planned') {
    await fetch('/api/happy/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, rating, nextAction }) }).catch(() => undefined);
  }

  return (
    <article className="card p-4 sm:p-5" aria-label="Respuesta de Happy">
      <div className="mb-4 flex items-center gap-2">
        <HappyAvatar size={30} />
        <HappyName />
        {turn.meta.route === 'mock' && <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[0.7rem] font-bold text-warn">RESPUESTA SIMULADA (PRUEBA)</span>}
        {turn.meta.grounding === 'retrieval_only' && <span className="rounded bg-official-soft px-1.5 py-0.5 text-[0.7rem] font-bold text-official">SOLO MALLA · SIN IA</span>}
      </div>
      <HappyTurnView turn={turn} onDevelop={onDevelop} busy={busy} />

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {canSave &&
          (entry.savedId ? (
            <>
              <span className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-official">
                <BookmarkCheck className="h-5 w-5" aria-hidden /> Guardada
              </span>
              <Link href={`/guardados/ideas/${entry.savedId}`} className="btn btn-ghost">
                Ver en Guardados
              </Link>
              <form action={createPlanFromIdea.bind(null, entry.savedId)}>
                <button type="submit" className="btn btn-secondary" onClick={() => turn.eventId && void sendFeedback(turn.eventId, entry.feedback ?? 'useful', 'planned')}>
                  <FilePlus2 className="h-4 w-4" aria-hidden /> Convertir en planeación
                </button>
              </form>
            </>
          ) : (
            <button type="button" onClick={save} disabled={pending} className="btn btn-secondary">
              <Bookmark className="h-4 w-4" aria-hidden /> {pending ? 'Guardando…' : 'Guardar idea'}
            </button>
          ))}
        {turn.eventId && (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="¿Te fue útil?">
            <span className="mr-1 text-xs text-ink-muted">¿Útil?</span>
            {(['useful', 'not_useful'] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={entry.feedback === r}
                aria-label={r === 'useful' ? 'Sí, útil' : 'No fue útil'}
                onClick={() => {
                  onFeedback(r);
                  void sendFeedback(turn.eventId!, r);
                }}
                className={`grid h-11 w-11 place-items-center rounded-lg ${entry.feedback === r ? 'bg-happy-soft text-happy' : 'text-ink-muted hover:bg-canvas'}`}
              >
                {r === 'useful' ? <ThumbsUp className="h-4 w-4" aria-hidden /> : <ThumbsDown className="h-4 w-4" aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
