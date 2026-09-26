export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-line" />
      <div className="h-40 animate-pulse rounded-2xl bg-line/70" />
      <div className="h-24 animate-pulse rounded-2xl bg-line/60" />
    </div>
  );
}
