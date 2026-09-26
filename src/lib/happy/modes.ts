import type { SectionKey } from '@/lib/curriculum/sections';

/**
 * Happy modes. V1 enables EXPLORAR, ATERRIZAR and CONECTAR. The registry is the
 * extension point for ADAPTAR / OBSERVAR / REGISTRAR: adding a mode means adding
 * an entry here (guidance + evidence priorities), not restructuring the pipeline.
 */
export type HappyModeKey = 'explorar' | 'aterrizar' | 'conectar' | 'adaptar' | 'observar' | 'registrar';
export type HappyStage = 'caminos' | 'desarrollo' | 'conexion';

export interface HappyModeDefinition {
  key: HappyModeKey;
  enabled: boolean;
  label: string;
  tagline: string;
  placeholder: string;
  /** Stage for a first turn (before the teacher picks a path). */
  initialStage: HappyStage;
  /** Sections of the current experience always offered as evidence. */
  coreSections: SectionKey[];
  guidance: string;
}

export const HAPPY_MODES: Record<HappyModeKey, HappyModeDefinition> = {
  explorar: {
    key: 'explorar',
    enabled: true,
    label: 'Explorar',
    tagline: 'Necesito ideas',
    placeholder: 'Ej.: Quiero trabajar animales pero ya hicimos sonidos y clasificación.',
    initialStage: 'caminos',
    coreSections: ['alcance', 'procesos', 'vivir', 'juego', 'exploracion', 'literatura', 'arte', 'caribe'],
    guidance:
      'La docente busca ideas. Ofrece 2–3 caminos realmente distintos entre sí (no variaciones de lo mismo), respetando lo que ya trabajó. Indica cuáles salen directamente de la malla y cuáles son ideas complementarias.',
  },
  aterrizar: {
    key: 'aterrizar',
    enabled: true,
    label: 'Aterrizar',
    tagline: 'Tengo una idea; ayúdame a desarrollarla',
    placeholder: 'Ej.: Quiero hacer algo con agua mañana, tengo 30 minutos.',
    initialStage: 'caminos',
    coreSections: ['alcance', 'vivir', 'proyectar', 'indicadores', 'dua', 'ambientes', 'juego', 'exploracion', 'literatura', 'arte'],
    guidance:
      'La docente ya tiene una idea. Respeta su idea como punto de partida: propone 2–3 formas concretas de aterrizarla en el aula (no la reemplaces por otra). Considera tiempo, materiales y edad del nivel.',
  },
  conectar: {
    key: 'conectar',
    enabled: true,
    label: 'Conectar',
    tagline: '¿Cómo se relaciona esto con nuestra malla?',
    placeholder: 'Ej.: ¿Qué dice nuestra malla sobre cooperación?',
    initialStage: 'conexion',
    coreSections: ['alcance'],
    guidance:
      'La docente quiere saber cómo se relaciona algo con la malla. Prioriza curriculumLinks con fragmentos concretos de la evidencia y explica brevemente la relación. Si la malla no lo contempla, dilo claramente (insufficientEvidence=true) y no inventes conexiones.',
  },
  adaptar: { key: 'adaptar', enabled: false, label: 'Adaptar', tagline: 'Otras formas de participar', placeholder: '', initialStage: 'caminos', coreSections: ['dua', 'ambientes'], guidance: '' },
  observar: { key: 'observar', enabled: false, label: 'Observar', tagline: 'Qué observar', placeholder: '', initialStage: 'conexion', coreSections: ['indicadores', 'observacion'], guidance: '' },
  registrar: { key: 'registrar', enabled: false, label: 'Registrar', tagline: 'Documentar lo vivido', placeholder: '', initialStage: 'conexion', coreSections: ['documentacion', 'evidencias'], guidance: '' },
};

export const ENABLED_MODES = Object.values(HAPPY_MODES).filter((m) => m.enabled);
export type EnabledModeKey = 'explorar' | 'aterrizar' | 'conectar';

export const DEVELOPMENT_SECTIONS = [
  { key: 'inicio', heading: 'Para empezar' },
  { key: 'desarrollo', heading: 'Cómo vivirlo' },
  { key: 'preguntas', heading: 'Preguntas posibles' },
  { key: 'materiales', heading: 'Materiales y ambiente' },
  { key: 'participacion', heading: 'Otras formas de participar' },
  { key: 'observar', heading: 'Qué observar' },
  { key: 'familias', heading: 'Conexión con familias' },
  { key: 'cierre', heading: 'Cierre' },
] as const;

export type DevelopmentSectionKey = (typeof DEVELOPMENT_SECTIONS)[number]['key'];
