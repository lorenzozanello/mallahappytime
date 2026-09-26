/**
 * Teacher vocabulary → curricular structure.
 *
 * Teachers should not need to know the workbook taxonomy. Each concept maps
 * everyday phrasing (triggers, matched on normalized stems/phrases) to the
 * sections where the malla holds that kind of information, plus related terms
 * used to widen lexical matching. This is retrieval metadata, never shown as
 * curriculum content.
 */
import type { SectionKey } from '@/lib/curriculum/sections';
import { normalizeForMatch } from '@/lib/curriculum/text';
import { stem } from './tokenize';

export interface Concept {
  key: string;
  label: string;
  /** Normalized phrases or stems (prefix-matched against query stems). */
  triggers: string[];
  sections: SectionKey[];
  expand: string[];
}

export const CONCEPTS: Concept[] = [
  { key: 'literatura', label: 'Literatura', triggers: ['literari', 'literatur', 'cuent', 'lectur', 'leer', 'libr', 'poesi', 'poema', 'rima', 'narra', 'relat', 'titere'], sections: ['literatura'], expand: ['literatura', 'cuentos', 'rimas', 'narración', 'lectura', 'relatos'] },
  { key: 'arte', label: 'Arte', triggers: ['arte', 'artistic', 'pintur', 'pintar', 'dibuj', 'music', 'plastic', 'danza', 'bail', 'cancion', 'teatr', 'modelad'], sections: ['arte'], expand: ['arte', 'pintura', 'música', 'dibujo', 'expresión', 'danza'] },
  { key: 'juego', label: 'Juego', triggers: ['jueg', 'jug', 'ludic'], sections: ['juego'], expand: ['juego', 'juego simbólico', 'rondas'] },
  { key: 'exploracion', label: 'Exploración del medio', triggers: ['explor', 'cienci', 'experiment', 'naturalez', 'plant', 'animal', 'agua', 'entorn', 'investig'], sections: ['exploracion', 'caribe'], expand: ['exploración', 'entorno', 'naturaleza', 'investigación', 'experimentar'] },
  { key: 'rectoras', label: 'Actividades rectoras', triggers: ['actividades rectoras', 'rector'], sections: ['juego', 'exploracion', 'literatura', 'arte'], expand: ['juego', 'arte', 'literatura', 'exploración'] },
  { key: 'turnos', label: 'Turnos y espera', triggers: ['turn', 'esper'], sections: ['emocional', 'indicadores', 'juego', 'competencias'], expand: ['turnos', 'esperar', 'turnos de palabra', 'acuerdos'] },
  { key: 'cooperacion', label: 'Cooperación', triggers: ['cooper', 'colabor', 'equip', 'compart', 'ayudar', 'solidari'], sections: ['emocional', 'indicadores', 'competencias', 'procesos'], expand: ['coopera', 'cooperación', 'compartir', 'acuerdos', 'grupo'] },
  { key: 'convivencia', label: 'Convivencia y acuerdos', triggers: ['convivenci', 'acuerd', 'norm', 'conflict', 'pele', 'limit', 'repar'], sections: ['emocional', 'indicadores', 'procesos'], expand: ['acuerdos', 'convivencia', 'normas', 'conflictos', 'reparación'] },
  { key: 'emociones', label: 'Emociones', triggers: ['emocion', 'sentimient', 'calm', 'regul', 'rabiet', 'frustr', 'llor', 'mied', 'triste', 'socioemocional'], sections: ['emocional', 'procesos', 'indicadores'], expand: ['emociones', 'calma', 'regulación', 'frustración'] },
  { key: 'familias', label: 'Familias', triggers: ['famili', 'padre', 'madre', 'casa', 'hogar', 'acudient', 'cuidador'], sections: ['familia', 'alertas'], expand: ['familia', 'casa', 'hogar', 'compartir en casa'] },
  { key: 'observar', label: 'Qué observar', triggers: ['observ', 'fijarm', 'mirar', 'notar', 'evalu', 'valor', 'seguimient'], sections: ['indicadores', 'observacion', 'valorar', 'evidencias'], expand: ['observa', 'indicadores', 'valorar', 'avances'] },
  { key: 'indicadores', label: 'Indicadores', triggers: ['indicador', 'logr', 'avanc', 'desempen', 'esperad', 'manifestacion'], sections: ['indicadores', 'competencias'], expand: ['indicadores', 'avances', 'competencias'] },
  { key: 'participacion', label: 'Otras formas de participación', triggers: ['inclus', 'dua', 'apoy', 'adapt', 'ajust', 'diversid', 'discapac', 'piar', 'particip', 'alternativ', 'diferenci', 'necesidades'], sections: ['dua'], expand: ['apoyos', 'alternativas', 'anticipación', 'participación'] },
  { key: 'documentacion', label: 'Documentación y registro', triggers: ['registr', 'document', 'portafoli', 'evidenci', 'foto', 'anecdot', 'bitacor'], sections: ['documentacion', 'evidencias', 'observacion'], expand: ['registro', 'documentación', 'portafolio', 'evidencias'] },
  { key: 'alertas', label: 'Alertas', triggers: ['alert', 'senal', 'preocup', 'dificult', 'retras'], sections: ['alertas'], expand: ['alertas', 'dificultad persistente', 'conversar con familia'] },
  { key: 'caribe', label: 'Contexto Caribe', triggers: ['carib', 'barranquill', 'cultur', 'region', 'costen', 'carnaval', 'barri'], sections: ['caribe'], expand: ['Caribe', 'Barranquilla', 'cultura'] },
  { key: 'riesgo', label: 'Seguridad y riesgo (GIRE)', triggers: ['riesg', 'segur', 'prevenc', 'emergenci', 'gire', 'accident', 'evacu'], sections: ['gire'], expand: ['seguridad', 'prevenir', 'riesgo'] },
  { key: 'ambientes', label: 'Ambientes y materiales', triggers: ['ambient', 'espaci', 'rincon', 'material', 'aula', 'provocacion'], sections: ['ambientes', 'proyectar'], expand: ['ambientes', 'materiales', 'espacios'] },
  { key: 'saberes', label: 'Saberes y nociones', triggers: ['saber', 'nocion', 'concept', 'contenid'], sections: ['saberes', 'nucleos'], expand: ['saberes', 'nociones'] },
  { key: 'proposito', label: 'Propósitos', triggers: ['proposit', 'objetiv', 'meta', 'intencion', 'para que', 'que buscamos', 'alcanc'], sections: ['propositos', 'alcance', 'procesos'], expand: ['propósitos', 'alcance'] },
  { key: 'momentos', label: 'Momentos pedagógicos', triggers: ['moment', 'indag', 'proyect', 'vivir', 'planea', 'secuencia didactica'], sections: ['indagar', 'proyectar', 'vivir', 'valorar'], expand: ['indagar', 'proyectar', 'vivir', 'valorar'] },
  { key: 'progresion', label: 'Progresión', triggers: ['progresion', 'anterior', 'previ', 'prepar', 'siguient', 'despues', 'dimension'], sections: ['progresion', 'perfil_entrada', 'perfil_salida'], expand: ['progresión', 'dimensión'] },
  { key: 'lenguaje', label: 'Lenguaje y comunicación', triggers: ['lenguaj', 'habl', 'oral', 'palabr', 'comunic', 'escrit', 'escrib', 'letr', 'vocabulari', 'fonolog'], sections: ['literatura', 'competencias', 'indicadores'], expand: ['lenguaje', 'oralidad', 'comunicar', 'escritura emergente'] },
  { key: 'pensamiento', label: 'Pensamiento lógico', triggers: ['numer', 'conteo', 'contar', 'matematic', 'patron', 'figur', 'geometr', 'clasific', 'medir', 'medicion', 'logic', 'compara', 'cantidad'], sections: ['saberes', 'exploracion', 'indicadores'], expand: ['clasificación', 'conteo', 'patrones', 'comparar'] },
  { key: 'cuerpo', label: 'Cuerpo y movimiento', triggers: ['motric', 'cuerp', 'movimient', 'corporal', 'equilibri', 'coordinacion', 'grafomotric'], sections: ['juego', 'arte', 'indicadores', 'procesos'], expand: ['cuerpo', 'movimiento', 'coordinación', 'motricidad'] },
  { key: 'autonomia', label: 'Autonomía y cuidado', triggers: ['autonom', 'cuidad', 'higien', 'aliment', 'rutin', 'autocuid'], sections: ['procesos', 'indicadores', 'ambientes'], expand: ['autonomía', 'rutinas', 'cuidado', 'higiene'] },
  { key: 'transicion', label: 'Transición a primaria', triggers: ['primari', 'transicion armonica', 'paso a primaria'], sections: ['procesos', 'dua', 'familia'], expand: ['primaria', 'transición'] },
];

export interface ConceptMatch {
  concept: Concept;
  trigger: string;
}

export function detectConcepts(query: string): ConceptMatch[] {
  const norm = normalizeForMatch(query);
  const queryStems = norm.split(' ').filter(Boolean).map(stem);
  const matches: ConceptMatch[] = [];
  for (const concept of CONCEPTS) {
    const trigger = concept.triggers.find((t) =>
      t.includes(' ') ? norm.includes(t) : queryStems.some((s) => s.startsWith(t) || (s.length >= 4 && t.startsWith(s))),
    );
    if (trigger) matches.push({ concept, trigger });
  }
  return matches;
}
