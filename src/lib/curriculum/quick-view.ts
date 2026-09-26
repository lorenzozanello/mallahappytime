/**
 * "Vista rápida": a scannable synthesis of an experience built ONLY from verbatim
 * fragments of the official workbook. No text is generated or paraphrased; each
 * bullet carries the ID of the chunk it comes from.
 */
import { EXPERIENCE_FIELDS, type ExperienceFieldKey } from './sections';
import { capitalize, splitItems } from './text';
import type { CurriculumExperience } from './types';

export interface QuickBullet {
  text: string;
  sourceId: string;
}

export interface QuickSection {
  key: 'buscamos' | 'vivirlo' | 'observar' | 'participacion' | 'familias';
  title: string;
  /** Short line explaining which official field the bullets come from. */
  sourceLabel: string;
  lead?: QuickBullet;
  bullets: QuickBullet[];
}

function fieldDef(key: ExperienceFieldKey) {
  return EXPERIENCE_FIELDS.find((f) => f.key === key)!;
}

function bulletsFrom(e: CurriculumExperience, key: ExperienceFieldKey, limit?: number): QuickBullet[] {
  const def = fieldDef(key);
  const items = splitItems(e.fields[key], def.split).map((t) => ({ text: capitalize(t), sourceId: `${e.id}-${def.code}` }));
  return limit ? items.slice(0, limit) : items;
}

const ACTIVITY_LABELS = { juego: 'Juego', exploracion: 'Exploración del medio', literatura: 'Literatura', arte: 'Arte' } as const;

export function buildQuickView(e: CurriculumExperience): QuickSection[] {
  const vivirlo: QuickBullet[] = (Object.keys(ACTIVITY_LABELS) as (keyof typeof ACTIVITY_LABELS)[]).map((k) => ({
    text: `${ACTIVITY_LABELS[k]}: ${e.activities[k].tema.replace(/\.$/, '')}`,
    sourceId: `${e.id}-${fieldDef(k).code}`,
  }));

  return [
    {
      key: 'buscamos',
      title: 'Qué buscamos',
      sourceLabel: 'Alcance y procesos imprescindibles',
      lead: { text: e.fields.alcance, sourceId: `${e.id}-ALC` },
      bullets: bulletsFrom(e, 'procesos'),
    },
    {
      key: 'vivirlo',
      title: 'Cómo podemos vivirlo',
      sourceLabel: 'Actividades rectoras (temas)',
      bullets: vivirlo,
    },
    {
      key: 'observar',
      title: 'Qué podemos observar',
      sourceLabel: 'Indicadores de desarrollo',
      bullets: bulletsFrom(e, 'indicadores'),
    },
    {
      key: 'participacion',
      title: 'Otras formas de participación',
      sourceLabel: 'Diferenciación, DUA y apoyos',
      bullets: bulletsFrom(e, 'dua'),
    },
    {
      key: 'familias',
      title: 'Cómo conectar con las familias',
      sourceLabel: 'Alianza familia-escuela',
      bullets: bulletsFrom(e, 'familia'),
    },
  ];
}

/** Compact overview for Inicio: a few "qué buscamos" and "qué observar" points. */
export function buildHomeOverview(e: CurriculumExperience) {
  return {
    buscamos: bulletsFrom(e, 'procesos', 3),
    observar: bulletsFrom(e, 'indicadores', 2),
  };
}
