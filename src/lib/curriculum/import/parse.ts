/**
 * Pure transformation: workbook cells → normalized, traceable curriculum corpus.
 * Build-time only (used by scripts/import-curriculum.ts and by parity tests).
 */
import { createHash } from 'node:crypto';
import {
  DIMENSIONS,
  EXPERIENCE_FIELDS,
  LEVEL_COLUMNS,
  SECTION_TAGS,
  type ExperienceFieldKey,
  type SectionKey,
} from '../sections';
import type {
  ActivityParts,
  CurriculumChunk,
  CurriculumCorpus,
  CurriculumExperience,
  CurriculumLevel,
  CurriculumVersion,
  DevelopmentSummary,
  ImportIssue,
  InstitutionalPrinciple,
  LevelId,
  PeriodNumber,
  Purpose,
  SourceReference,
} from '../types';

/** Sheet contents as 1-based rows/columns: sheet[row][col] (index 0 unused). */
export type SheetCells = (string | null)[][];
export interface WorkbookCells {
  fileName: string;
  sha256: string;
  sheets: Record<string, SheetCells>;
}

export const SHEET_MALLA = 'Malla ajustada';
export const SHEET_OBSERVACIONES = 'Observaciones';
export const SHEET_PROGRESION = 'Progresión por dimensión';

export const CURRICULUM_VERSION_META = {
  id: 'ht-malla-2026-06',
  label: 'Malla Happy Time · Versión final junio 2026',
  effectiveDate: '2026-06-01',
} as const;

const LEVEL_BY_SOURCE_NAME: Record<string, { id: LevelId; code: string; order: number }> = {
  'Step 1': { id: 'step-1', code: 'S1', order: 1 },
  'Step 2': { id: 'step-2', code: 'S2', order: 2 },
  'Step 3': { id: 'step-3', code: 'S3', order: 3 },
  'Kínder': { id: 'kinder', code: 'K', order: 4 },
  'Jardín/Kínder': { id: 'kinder', code: 'K', order: 4 },
  'Transición': { id: 'transicion', code: 'T', order: 5 },
};

const ROMAN: Record<string, PeriodNumber> = { I: 1, II: 2, III: 3, IV: 4 };

export class CurriculumImportError extends Error {}

function colLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}

function cell(sheet: SheetCells, row: number, col: number): string {
  const v = sheet[row]?.[col];
  return typeof v === 'string' ? v.trim() : '';
}

function requireSheet(wb: WorkbookCells, name: string): SheetCells {
  const s = wb.sheets[name];
  if (!s) throw new CurriculumImportError(`Hoja requerida no encontrada: "${name}"`);
  return s;
}

function lastDataRow(sheet: SheetCells): number {
  for (let r = sheet.length - 1; r >= 1; r--) {
    if (sheet[r]?.some((v) => typeof v === 'string' && v.trim())) return r;
  }
  return 0;
}

export function parseActivity(text: string, where: string): ActivityParts {
  const m = /^Tema:\s*([\s\S]*?)\s*Competencia:\s*([\s\S]*?)\s*Avance:\s*([\s\S]*?)\s*Evidencia:\s*([\s\S]*)$/.exec(text);
  if (!m) throw new CurriculumImportError(`Actividad rectora sin estructura Tema/Competencia/Avance/Evidencia en ${where}`);
  return { tema: m[1]!.trim(), competencia: m[2]!.trim(), avance: m[3]!.trim(), evidencia: m[4]!.trim() };
}

export function parsePurposes(text: string, where: string): Purpose[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const m = /^(\d+)\.\s*([\s\S]*?)\s*\n\s*(En esta experiencia se logra cuando[\s\S]*)$/.exec(block);
    if (!m) throw new CurriculumImportError(`Propósito ${i + 1} con formato inesperado en ${where}`);
    return { number: Number(m[1]), statement: m[2]!.trim(), realization: m[3]!.trim() };
  });
}

export function splitDocumentation(text: string, where: string): { documentacion: string; alertas: string } {
  const idx = text.indexOf('Alertas:');
  if (idx < 0) throw new CurriculumImportError(`Documentación sin marcador "Alertas:" en ${where}`);
  return { documentacion: text.slice(0, idx).trim(), alertas: text.slice(idx).trim() };
}

export function parseWorkbook(wb: WorkbookCells): CurriculumCorpus {
  const issues: ImportIssue[] = [];
  const version: CurriculumVersion = { ...CURRICULUM_VERSION_META, sourceFile: wb.fileName, sourceSha256: wb.sha256 };
  const ref = (sheet: string, row: number, col: number): SourceReference => ({
    file: wb.fileName,
    sheet,
    cell: `${colLetter(col)}${row}`,
  });

  const malla = requireSheet(wb, SHEET_MALLA);

  // --- Header validation (fail loudly on structural drift) ---
  for (const { column, sourceHeader } of [...Object.values(LEVEL_COLUMNS), ...EXPERIENCE_FIELDS]) {
    const actual = cell(malla, 1, column);
    if (actual !== sourceHeader) {
      throw new CurriculumImportError(
        `Encabezado inesperado en ${SHEET_MALLA}!${colLetter(column)}1: "${actual}" (se esperaba "${sourceHeader}")`,
      );
    }
  }

  const levels: CurriculumLevel[] = [];
  const experiences: CurriculumExperience[] = [];
  const chunks: CurriculumChunk[] = [];
  let currentLevel: CurriculumLevel | null = null;
  const last = lastDataRow(malla);

  const pushChunk = (c: Omit<CurriculumChunk, 'curriculumVersion' | 'contentHash' | 'status' | 'updatedAt' | 'authority' | 'tags'> & { extraTags?: string[] }) => {
    const { extraTags, ...rest } = c;
    if (!rest.content) return;
    if (chunks.some((x) => x.id === rest.id)) throw new CurriculumImportError(`ID duplicado: ${rest.id}`);
    chunks.push({
      ...rest,
      curriculumVersion: version.id,
      authority: 'institutional',
      tags: [...new Set([...SECTION_TAGS[rest.section], ...(extraTags ?? [])])],
      contentHash: hashContent(rest.content),
      status: 'active',
      updatedAt: version.effectiveDate,
    });
  };

  for (let row = 2; row <= last; row++) {
    const levelName = cell(malla, row, LEVEL_COLUMNS.nivel.column);
    if (levelName) {
      const mapped = LEVEL_BY_SOURCE_NAME[levelName];
      if (!mapped) throw new CurriculumImportError(`Nivel desconocido "${levelName}" en ${SHEET_MALLA}!A${row}`);
      currentLevel = {
        id: mapped.id,
        code: mapped.code,
        name: levelName,
        order: mapped.order,
        cycle: cell(malla, row, LEVEL_COLUMNS.ciclo.column),
        equivalence: cell(malla, row, LEVEL_COLUMNS.equivalencia.column),
        entryAge: cell(malla, row, LEVEL_COLUMNS.edadEntrada.column),
        exitAge: cell(malla, row, LEVEL_COLUMNS.edadSalida.column),
        entryProfile: cell(malla, row, LEVEL_COLUMNS.perfilEntrada.column),
        exitProfile: cell(malla, row, LEVEL_COLUMNS.perfilSalida.column),
        sourceRow: row,
      };
      levels.push(currentLevel);
      pushChunk({
        id: `HT-${mapped.code}-PERFIL-ENT`,
        levelId: mapped.id,
        period: null,
        experienceId: null,
        section: 'perfil_entrada',
        subsection: null,
        content: currentLevel.entryProfile,
        sourceReference: ref(SHEET_MALLA, row, LEVEL_COLUMNS.perfilEntrada.column),
      });
      pushChunk({
        id: `HT-${mapped.code}-PERFIL-SAL`,
        levelId: mapped.id,
        period: null,
        experienceId: null,
        section: 'perfil_salida',
        subsection: null,
        content: currentLevel.exitProfile,
        sourceReference: ref(SHEET_MALLA, row, LEVEL_COLUMNS.perfilSalida.column),
      });
    }
    if (!currentLevel) throw new CurriculumImportError(`Fila ${row} sin nivel asociado`);

    const periodRaw = cell(malla, row, LEVEL_COLUMNS.periodo.column);
    const pm = /^Periodo\s+([IV]+)\s*\(([^)]+)\)$/.exec(periodRaw);
    if (!pm || !ROMAN[pm[1]!]) throw new CurriculumImportError(`Periodo con formato inesperado "${periodRaw}" en ${SHEET_MALLA}!H${row}`);
    const period = ROMAN[pm[1]!]!;
    const periodCode = pm[2]!;
    const expId = `HT-${currentLevel.code}-P${period}`;
    const where = `${SHEET_MALLA} fila ${row} (${expId})`;

    const fields = {} as Record<ExperienceFieldKey, string>;
    for (const f of EXPERIENCE_FIELDS) {
      const v = cell(malla, row, f.column);
      if (!v) {
        issues.push({ kind: 'ambiguity', location: `${SHEET_MALLA}!${colLetter(f.column)}${row}`, description: `Campo "${f.label}" vacío en ${expId}.` });
      }
      fields[f.key] = v;
    }

    const purposes = parsePurposes(fields.propositos, where);
    const activities = {
      juego: parseActivity(fields.juego, `${where} · Juego`),
      exploracion: parseActivity(fields.exploracion, `${where} · Exploración`),
      literatura: parseActivity(fields.literatura, `${where} · Literatura`),
      arte: parseActivity(fields.arte, `${where} · Arte`),
    };
    const documentation = splitDocumentation(fields.documentacion, where);

    const experience: CurriculumExperience = {
      id: expId,
      levelId: currentLevel.id,
      period,
      periodLabel: `Periodo ${pm[1]}`,
      periodCode,
      title: cell(malla, row, LEVEL_COLUMNS.experiencia.column),
      fields,
      purposes,
      activities,
      documentation,
      sourceRow: row,
    };
    if (experiences.some((e) => e.id === expId)) throw new CurriculumImportError(`Experiencia duplicada ${expId}`);
    experiences.push(experience);

    const base = { levelId: currentLevel.id, period, experienceId: expId };
    const titleTags = [experience.title];
    for (const f of EXPERIENCE_FIELDS) {
      const sourceReference = ref(SHEET_MALLA, row, f.column);
      if (f.key === 'propositos') {
        const blocks = fields.propositos.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
        purposes.forEach((p, i) => {
          const block = blocks[i]!;
          pushChunk({ ...base, id: `${expId}-PROP-0${i + 1}`, section: 'propositos', subsection: `Propósito ${p.number}`, content: block, sourceReference, extraTags: titleTags });
        });
        continue;
      }
      if (f.key === 'documentacion') {
        pushChunk({ ...base, id: `${expId}-DOC`, section: 'documentacion', subsection: null, content: documentation.documentacion, sourceReference, extraTags: titleTags });
        pushChunk({ ...base, id: `${expId}-ALR`, section: 'alertas', subsection: null, content: documentation.alertas, sourceReference, extraTags: titleTags });
        continue;
      }
      pushChunk({ ...base, id: `${expId}-${f.code}`, section: f.key as SectionKey, subsection: null, content: fields[f.key], sourceReference, extraTags: titleTags });
    }
  }

  const expectedLevels = ['step-1', 'step-2', 'step-3', 'kinder', 'transicion'];
  if (levels.map((l) => l.id).join() !== expectedLevels.join()) {
    throw new CurriculumImportError(`Niveles inesperados: ${levels.map((l) => l.id).join(', ')}`);
  }
  for (const l of levels) {
    const periods = experiences.filter((e) => e.levelId === l.id).map((e) => e.period).join();
    if (periods !== '1,2,3,4') throw new CurriculumImportError(`El nivel ${l.name} no tiene los periodos I–IV (${periods})`);
  }

  // --- Progresión por dimensión ---
  const prog = requireSheet(wb, SHEET_PROGRESION);
  if (cell(prog, 1, 1) !== 'Dimensión') throw new CurriculumImportError('Encabezado inesperado en Progresión por dimensión!A1');
  DIMENSIONS.forEach((d, i) => {
    const actual = cell(prog, 1, i + 2);
    if (actual !== d.sourceHeader) throw new CurriculumImportError(`Dimensión inesperada "${actual}" en ${SHEET_PROGRESION}!${colLetter(i + 2)}1`);
  });
  const developmentSummaries: DevelopmentSummary[] = [];
  for (let row = 2; row <= lastDataRow(prog); row++) {
    const name = cell(prog, row, 1);
    const mapped = LEVEL_BY_SOURCE_NAME[name];
    if (!mapped) throw new CurriculumImportError(`Nivel desconocido "${name}" en ${SHEET_PROGRESION}!A${row}`);
    const lvl = levels.find((l) => l.id === mapped.id)!;
    if (name !== lvl.name) {
      issues.push({
        kind: 'ambiguity',
        location: `${SHEET_PROGRESION}!A${row}`,
        description: `El nivel se nombra "${name}" en esta hoja y "${lvl.name}" en ${SHEET_MALLA} (equivalencia: "${lvl.equivalence}"). Se interpretan como el mismo nivel (${lvl.id}); se conserva el nombre de ${SHEET_MALLA} para mostrar.`,
      });
    }
    DIMENSIONS.forEach((d, i) => {
      const content = cell(prog, row, i + 2);
      const sourceReference = ref(SHEET_PROGRESION, row, i + 2);
      const id = `HT-${mapped.code}-DIM-${d.code}`;
      developmentSummaries.push({ id, levelId: mapped.id, dimension: d.key, content, sourceReference });
      pushChunk({ id, levelId: mapped.id, period: null, experienceId: null, section: 'progresion', subsection: d.label, content, sourceReference, extraTags: [d.label.toLowerCase()] });
    });
  }

  // --- Observaciones (institutional principles) ---
  const obs = requireSheet(wb, SHEET_OBSERVACIONES);
  const principles: InstitutionalPrinciple[] = [];
  for (let row = 2; row <= lastDataRow(obs); row++) {
    const content = cell(obs, row, 1);
    if (!content) continue;
    const order = principles.length + 1;
    const id = `HT-INST-PRIN-${String(order).padStart(2, '0')}`;
    const sourceReference = ref(SHEET_OBSERVACIONES, row, 1);
    principles.push({ id, order, content, sourceReference });
    pushChunk({ id, levelId: null, period: null, experienceId: null, section: 'principio', subsection: null, content, sourceReference });
  }

  issues.push(
    {
      kind: 'normalization',
      location: `${SHEET_MALLA}!A2:G21`,
      description: 'Las columnas de nivel (A–G) están combinadas cada 4 filas; se asignan a los cuatro periodos de cada nivel.',
    },
    {
      kind: 'normalization',
      location: `${SHEET_MALLA}!AD2:AD21`,
      description: 'La columna "Documentación pedagógica y alertas" se divide técnicamente en dos fragmentos en el marcador "Alertas:" (sin alterar el texto).',
    },
    {
      kind: 'normalization',
      location: `${SHEET_MALLA}!K2:K21`,
      description: 'Los propósitos esenciales se dividen en sus tres bloques numerados. Los enunciados generales se repiten en las 20 experiencias; solo cambia "En esta experiencia se logra cuando…".',
    },
    {
      kind: 'ambiguity',
      location: `${SHEET_MALLA}!H2:H21`,
      description: 'La malla no define fechas de calendario para los periodos I–IV; el periodo activo lo elige la docente (o la institución) y no se infiere.',
    },
  );

  return { version, levels, experiences, developmentSummaries, principles, chunks, issues };
}
