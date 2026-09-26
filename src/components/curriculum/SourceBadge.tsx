import { BookMarked, Globe, Sparkles } from 'lucide-react';

export type BadgeSource = 'institutional' | 'generated' | 'external';

const STYLES: Record<BadgeSource, { label: string; cls: string; Icon: typeof BookMarked }> = {
  institutional: { label: 'Desde nuestra malla', cls: 'bg-official-soft text-official', Icon: BookMarked },
  generated: { label: 'Idea complementaria de Happy', cls: 'bg-happy-soft text-happy', Icon: Sparkles },
  external: { label: 'Recurso externo', cls: 'bg-[#eef2f7] text-[#334155]', Icon: Globe },
};

/** The single visual language for provenance, used everywhere content appears. */
export function SourceBadge({ type, compact = false }: { type: BadgeSource; compact?: boolean }) {
  const s = STYLES[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.72rem] font-bold uppercase tracking-wide ${s.cls}`}>
      <s.Icon className="h-3.5 w-3.5" aria-hidden />
      {compact && type === 'generated' ? 'Idea de Happy' : s.label}
    </span>
  );
}
