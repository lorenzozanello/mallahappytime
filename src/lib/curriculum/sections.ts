/**
 * Mapping between the columns of the authoritative workbook ("Malla ajustada")
 * and the canonical section keys used across the platform.
 *
 * `sourceHeader` must match the workbook header exactly; the importer fails if
 * the workbook structure drifts, instead of silently mis-assigning content.
 */

export type ExperienceFieldKey =
  | 'alcance'
  | 'propositos'
  | 'indagar'
  | 'proyectar'
  | 'vivir'
  | 'valorar'
  | 'juego'
  | 'exploracion'
  | 'literatura'
  | 'arte'
  | 'nucleos'
  | 'saberes'
  | 'competencias'
  | 'evidencias'
  | 'dua'
  | 'caribe'
  | 'gire'
  | 'procesos'
  | 'ambientes'
  | 'indicadores'
  | 'documentacion'
  | 'emocional'
  | 'familia'
  | 'observacion';

/** Section keys used by chunks. Includes derived sub-sections and level/institution scoped sections. */
export type SectionKey =
  | Exclude<ExperienceFieldKey, 'documentacion'>
  | 'documentacion'
  | 'alertas'
  | 'perfil_entrada'
  | 'perfil_salida'
  | 'progresion'
  | 'principio';

/** How a field is split into list items for scannable display and fine-grained retrieval. */
export type SplitMode = 'none' | 'semicolon' | 'semicolon_or_comma';

export interface FieldDefinition {
  key: ExperienceFieldKey;
  /** Column index (1-based) in the workbook. */
  column: number;
  sourceHeader: string;
  /** Short code used in canonical chunk IDs. */
  code: string;
  /** Official label (as named in the workbook, lightly shortened). */
  label: string;
  split: SplitMode;
}

export const EXPERIENCE_FIELDS: readonly FieldDefinition[] = [
  { key: 'alcance', column: 10, sourceHeader: 'Alcance de la experiencia integradora', code: 'ALC', label: 'Alcance de la experiencia', split: 'none' },
  { key: 'propositos', column: 11, sourceHeader: 'Propósitos esenciales', code: 'PROP', label: 'Propósitos esenciales', split: 'none' },
  { key: 'indagar', column: 12, sourceHeader: 'Momento de Indagar', code: 'IND', label: 'Indagar', split: 'none' },
  { key: 'proyectar', column: 13, sourceHeader: 'Momento de Proyectar', code: 'PRY', label: 'Proyectar', split: 'none' },
  { key: 'vivir', column: 14, sourceHeader: 'Momento de Vivir la experiencia', code: 'VIV', label: 'Vivir la experiencia', split: 'none' },
  { key: 'valorar', column: 15, sourceHeader: 'Momento de Valorar el proceso', code: 'VAL', label: 'Valorar el proceso', split: 'none' },
  { key: 'juego', column: 16, sourceHeader: 'Juego: tema, competencia, avance y evidencia', code: 'AR-JUE', label: 'Juego', split: 'none' },
  { key: 'exploracion', column: 17, sourceHeader: 'Exploración del medio: tema, competencia, avance y evidencia', code: 'AR-EXP', label: 'Exploración del medio', split: 'none' },
  { key: 'literatura', column: 18, sourceHeader: 'Literatura: tema, competencia, avance y evidencia', code: 'AR-LIT', label: 'Literatura', split: 'none' },
  { key: 'arte', column: 19, sourceHeader: 'Arte: tema, competencia, avance y evidencia', code: 'AR-ART', label: 'Arte', split: 'none' },
  { key: 'nucleos', column: 20, sourceHeader: 'Núcleos de experiencia', code: 'NUC', label: 'Núcleos de experiencia', split: 'semicolon_or_comma' },
  { key: 'saberes', column: 21, sourceHeader: 'Saberes y nociones movilizadas', code: 'SAB', label: 'Saberes y nociones movilizadas', split: 'semicolon_or_comma' },
  { key: 'competencias', column: 22, sourceHeader: 'Competencias de desarrollo', code: 'COMP', label: 'Competencias de desarrollo', split: 'semicolon' },
  { key: 'evidencias', column: 23, sourceHeader: 'Evidencias pedagógicas integradas', code: 'EVI', label: 'Evidencias pedagógicas integradas', split: 'semicolon' },
  { key: 'dua', column: 24, sourceHeader: 'Diferenciación, DUA, apoyos razonables y PIAR cuando aplique', code: 'DUA', label: 'Diferenciación, DUA, apoyos razonables y PIAR', split: 'semicolon' },
  { key: 'caribe', column: 25, sourceHeader: 'Contexto Caribe', code: 'CAR', label: 'Contexto Caribe', split: 'none' },
  { key: 'gire', column: 26, sourceHeader: 'GIRE', code: 'GIRE', label: 'GIRE (gestión del riesgo escolar)', split: 'none' },
  { key: 'procesos', column: 27, sourceHeader: 'Procesos imprescindibles', code: 'PROC', label: 'Procesos imprescindibles', split: 'semicolon' },
  { key: 'ambientes', column: 28, sourceHeader: 'Ambientes saludables', code: 'AMB', label: 'Ambientes saludables', split: 'none' },
  { key: 'indicadores', column: 29, sourceHeader: 'Indicadores de desarrollo', code: 'INDI', label: 'Indicadores de desarrollo', split: 'semicolon' },
  { key: 'documentacion', column: 30, sourceHeader: 'Documentación pedagógica y alertas', code: 'DOC', label: 'Documentación pedagógica y alertas', split: 'none' },
  { key: 'emocional', column: 31, sourceHeader: 'Eje de Educación Emocional', code: 'EMO', label: 'Eje de Educación Emocional', split: 'semicolon' },
  { key: 'familia', column: 32, sourceHeader: 'Alianza familia-escuela', code: 'FAM', label: 'Alianza familia-escuela', split: 'semicolon' },
  { key: 'observacion', column: 33, sourceHeader: 'Observación y valoración', code: 'OBS', label: 'Observación y valoración', split: 'none' },
] as const;

export const LEVEL_COLUMNS = {
  nivel: { column: 1, sourceHeader: 'Nivel' },
  ciclo: { column: 2, sourceHeader: 'Ciclo normativo' },
  equivalencia: { column: 3, sourceHeader: 'Equivalencia' },
  edadEntrada: { column: 4, sourceHeader: 'Edad de entrada aprox.' },
  edadSalida: { column: 5, sourceHeader: 'Edad de salida aprox.' },
  perfilEntrada: { column: 6, sourceHeader: 'Perfil de entrada sintetizado' },
  perfilSalida: { column: 7, sourceHeader: 'Perfil de salida sintetizado' },
  periodo: { column: 8, sourceHeader: 'Periodo / código' },
  experiencia: { column: 9, sourceHeader: 'Experiencia integradora' },
} as const;

/** Human-facing labels for every chunk section (used by search results and Happy source cards). */
export const SECTION_LABELS: Record<SectionKey, string> = {
  alcance: 'Alcance de la experiencia',
  propositos: 'Propósitos esenciales',
  indagar: 'Momento de Indagar',
  proyectar: 'Momento de Proyectar',
  vivir: 'Momento de Vivir la experiencia',
  valorar: 'Momento de Valorar el proceso',
  juego: 'Actividad rectora · Juego',
  exploracion: 'Actividad rectora · Exploración del medio',
  literatura: 'Actividad rectora · Literatura',
  arte: 'Actividad rectora · Arte',
  nucleos: 'Núcleos de experiencia',
  saberes: 'Saberes y nociones',
  competencias: 'Competencias de desarrollo',
  evidencias: 'Evidencias pedagógicas',
  dua: 'Diferenciación, DUA y apoyos',
  caribe: 'Contexto Caribe',
  gire: 'GIRE',
  procesos: 'Procesos imprescindibles',
  ambientes: 'Ambientes saludables',
  indicadores: 'Indicadores de desarrollo',
  documentacion: 'Documentación pedagógica',
  alertas: 'Alertas (orientan, no diagnostican)',
  emocional: 'Educación emocional',
  familia: 'Alianza familia-escuela',
  observacion: 'Observación y valoración',
  perfil_entrada: 'Perfil de entrada del nivel',
  perfil_salida: 'Perfil de salida del nivel',
  progresion: 'Progresión por dimensión',
  principio: 'Principio institucional',
};

/**
 * Retrieval tags per section. These are technical metadata (not curriculum
 * content): they describe what kind of information a section holds so that
 * teacher vocabulary ("qué observar", "familias") reaches the right section.
 */
export const SECTION_TAGS: Record<SectionKey, readonly string[]> = {
  alcance: ['alcance', 'intencion', 'objetivo', 'que buscamos', 'proposito'],
  propositos: ['propositos', 'proposito', 'intencion', 'que buscamos', 'identidad', 'comunicacion', 'aprender'],
  indagar: ['momento', 'indagar', 'diagnostico inicial', 'intereses', 'inicio', 'explorar saberes previos'],
  proyectar: ['momento', 'proyectar', 'planear', 'planeacion', 'ambientes', 'provocaciones', 'materiales', 'disenar'],
  vivir: ['momento', 'vivir', 'actividades', 'ideas', 'propuestas', 'como vivirlo', 'experiencias'],
  valorar: ['momento', 'valorar', 'evaluacion', 'valoracion', 'ajustar', 'cierre'],
  juego: ['actividades rectoras', 'actividad rectora', 'juego', 'jugar', 'ludico', 'actividades'],
  exploracion: ['actividades rectoras', 'actividad rectora', 'exploracion del medio', 'explorar', 'ciencia', 'naturaleza', 'entorno', 'actividades'],
  literatura: ['actividades rectoras', 'actividad rectora', 'literatura', 'literarias', 'cuentos', 'lectura', 'libros', 'actividades'],
  arte: ['actividades rectoras', 'actividad rectora', 'arte', 'artisticas', 'musica', 'plastica', 'expresion', 'actividades'],
  nucleos: ['nucleos', 'temas', 'contenidos'],
  saberes: ['saberes', 'nociones', 'conceptos', 'contenidos', 'temas'],
  competencias: ['competencias', 'desarrollo', 'habilidades'],
  evidencias: ['evidencias', 'documentacion', 'registro', 'portafolio'],
  dua: ['dua', 'diferenciacion', 'inclusion', 'apoyos', 'ajustes razonables', 'piar', 'participacion', 'otras formas de participar', 'alternativas'],
  caribe: ['contexto caribe', 'caribe', 'barranquilla', 'cultura', 'territorio', 'contexto'],
  gire: ['gire', 'riesgo', 'seguridad', 'cuidado', 'prevencion'],
  procesos: ['procesos imprescindibles', 'que buscamos', 'aprendizajes clave', 'desarrollo'],
  ambientes: ['ambientes', 'ambientes saludables', 'espacios', 'materiales', 'bienestar'],
  indicadores: ['indicadores', 'que observar', 'observar', 'manifestaciones', 'desarrollo', 'avances', 'logros'],
  documentacion: ['documentacion', 'registro', 'evidencias', 'portafolio', 'registrar'],
  alertas: ['alertas', 'senales', 'acompanamiento', 'familia', 'apoyos'],
  emocional: ['educacion emocional', 'emociones', 'socioemocional', 'convivencia', 'relaciones', 'regulacion'],
  familia: ['familia', 'familias', 'casa', 'hogar', 'alianza familia escuela', 'padres', 'participacion de familias'],
  observacion: ['observacion', 'que observar', 'observar', 'valoracion', 'evaluacion cualitativa', 'evaluar'],
  perfil_entrada: ['perfil', 'perfil de entrada', 'caracteristicas', 'edad', 'nivel'],
  perfil_salida: ['perfil', 'perfil de salida', 'caracteristicas', 'egreso', 'nivel'],
  progresion: ['progresion', 'dimension', 'desarrollo', 'antes', 'despues', 'secuencia'],
  principio: ['principios', 'institucional', 'orientaciones', 'evaluacion', 'politica'],
};

/** Development dimensions as they appear in the "Progresión por dimensión" sheet. */
export const DIMENSIONS = [
  { key: 'cognitiva', code: 'COG', sourceHeader: 'Cognitiva', label: 'Cognitiva' },
  { key: 'comunicativa', code: 'COM', sourceHeader: 'Comunicativa', label: 'Comunicativa' },
  { key: 'socioemocional', code: 'SOC', sourceHeader: 'Socioemocional', label: 'Socioemocional' },
  { key: 'corporal', code: 'COR', sourceHeader: 'Corporal', label: 'Corporal' },
  { key: 'estetica', code: 'EST', sourceHeader: 'Estética', label: 'Estética' },
  { key: 'etico_moral', code: 'ETI', sourceHeader: 'Ético-moral', label: 'Ético-moral' },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]['key'];
