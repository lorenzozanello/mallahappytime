'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-extrabold">Algo salió mal</h1>
      <p className="text-ink-soft">No pudimos cargar esta sección. Intenta de nuevo; si persiste, avisa a coordinación.</p>
      <button type="button" onClick={reset} className="btn btn-primary">
        Reintentar
      </button>
    </main>
  );
}
