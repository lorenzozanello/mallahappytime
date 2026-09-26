/**
 * Policy / grounding enforcement applied to every model output before it reaches the UI.
 *
 * - Source IDs must belong to the evidence actually provided for this turn.
 * - "institutional" content without valid evidence is downgraded to "generated"
 *   (never the other way around).
 * - Link labels come from the corpus, not from the model.
 * - Filler openings are removed; clinical labels and numeric child ratings are flagged.
 */
import type { CurriculumChunk } from '@/lib/curriculum/types';
import { DEVELOPMENT_SECTIONS } from './modes';
import type { HappyItem, HappyModelOutput, HappyNotice, HappyOption, HappyTurn, SourceRef } from './schema';

export interface ValidationReport {
  status: 'ok' | 'corrected' | 'safety_flag';
  droppedSourceIds: string[];
  downgraded: number;
  flags: string[];
}

const FILLER = [
  /^¡?\s*(excelente|buena|gran|qué buena|muy buena)\s+(pregunta|idea)[^.!]*[.!]\s*/i,
  /^¡?\s*qué\s+(maravillosa|hermosa|linda|bonita|genial)\s+idea[^.!]*[.!]\s*/i,
  /^¡?\s*(me encanta|genial|perfecto|claro que sí)[^.!]*[.!]\s*/i,
];

const CLINICAL = /\b(tdah|autismo|autista|tea\b|asperger|dislexia|disl[eé]xic|trastorno|s[ií]ndrome|hiperactiv[oa]|retraso (mental|del desarrollo)|discapacidad intelectual|diagn[oó]stic[oa] de)\b/i;
const NUMERIC_RATING = /\b(\d+(?:[.,]\d+)?\s*(?:\/|sobre|de)\s*(?:5|10|20|100)\b|puntaje|calificaci[oó]n numérica|nota de \d)/i;

export function stripFiller(text: string): string {
  let out = text.trim();
  for (const re of FILLER) out = out.replace(re, '');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function detectClinicalRequest(message: string): boolean {
  return CLINICAL.test(message) || /\b(diagnostic|tiene algún problema|será que tiene|es normal que no hable)\b/i.test(message);
}

export function validateModelOutput(
  output: HappyModelOutput,
  evidence: CurriculumChunk[],
  toRef: (c: CurriculumChunk) => SourceRef,
): { turn: Omit<HappyTurn, 'eventId' | 'mode' | 'stage' | 'meta' | 'notices'>; report: ValidationReport; notices: HappyNotice[] } {
  const allowed = new Map(evidence.map((c) => [c.id, c]));
  const report: ValidationReport = { status: 'ok', droppedSourceIds: [], downgraded: 0, flags: [] };

  const refs = (ids: string[]): SourceRef[] => {
    const out: SourceRef[] = [];
    for (const raw of ids) {
      const id = raw.trim().replace(/^\[|\]$/g, '');
      const chunk = allowed.get(id);
      if (!chunk) {
        report.droppedSourceIds.push(raw);
        continue;
      }
      if (!out.some((r) => r.sourceId === id)) out.push(toRef(chunk));
    }
    return out;
  };

  const item = (text: string, sourceType: 'institutional' | 'generated', ids: string[]): HappyItem => {
    const sources = refs(ids);
    let type: HappyItem['sourceType'] = sourceType;
    if (type === 'institutional' && sources.length === 0) {
      type = 'generated';
      report.downgraded++;
    }
    return { text: text.trim(), sourceType: type, sources };
  };

  const options: HappyOption[] = output.options
    .filter((o) => o.title.trim())
    .map((o) => ({ title: o.title.trim(), ...item(o.description, o.sourceType, o.sourceIds) }));

  const development = output.development
    ? {
        title: output.development.title.trim(),
        sections: DEVELOPMENT_SECTIONS.flatMap((def) => {
          const items = output.development!.sections.filter((s) => s.key === def.key).flatMap((s) => s.items);
          const mapped = items.filter((i) => i.text.trim()).map((i) => item(i.text, i.sourceType, i.sourceIds));
          return mapped.length ? [{ key: def.key, heading: def.heading, items: mapped }] : [];
        }),
      }
    : null;

  const curriculumLinks: HappyTurn['curriculumLinks'] = [];
  for (const link of output.curriculumLinks) {
    const [ref] = refs([link.sourceId]);
    if (ref && !curriculumLinks.some((l) => l.sourceId === ref.sourceId)) curriculumLinks.push({ ...ref, why: link.why.trim() || null });
  }

  const understanding = stripFiller(output.understanding);
  const notices: HappyNotice[] = [];
  const allText = [understanding, output.nextStep, ...options.map((o) => `${o.title} ${o.text}`), ...(development?.sections.flatMap((s) => s.items.map((i) => i.text)) ?? [])].join('\n');
  if (CLINICAL.test(allText)) {
    report.flags.push('clinical_language');
    notices.push({
      kind: 'safety',
      text: 'Happy no diagnostica ni etiqueta a niñas y niños. Ante una preocupación, describe lo observable y conversa con la familia y el equipo de apoyo institucional.',
    });
  }
  if (NUMERIC_RATING.test(allText)) {
    report.flags.push('numeric_rating');
    notices.push({ kind: 'safety', text: 'En Happy Time la valoración es cualitativa: no se usan puntajes ni calificaciones numéricas para niñas y niños.' });
  }
  if (report.droppedSourceIds.length || report.downgraded) {
    notices.push({
      kind: 'info',
      text: 'Algunas referencias propuestas por Happy no correspondían a la evidencia de la malla y se retiraron. Lo que no tiene respaldo aparece como idea complementaria.',
    });
  }
  report.status = report.flags.length ? 'safety_flag' : report.droppedSourceIds.length || report.downgraded ? 'corrected' : 'ok';

  return {
    turn: {
      understanding,
      options,
      development,
      curriculumLinks,
      insufficientEvidence: output.insufficientEvidence,
      nextStep: output.nextStep.trim(),
    },
    report,
    notices,
  };
}
