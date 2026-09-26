import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import committed from '@/lib/curriculum/generated/corpus.json';
import { parseWorkbook, CurriculumImportError, SHEET_MALLA, type WorkbookCells } from '@/lib/curriculum/import/parse';
import { readWorkbook } from '@/lib/curriculum/import/read-workbook';
import { buildQuickView } from '@/lib/curriculum/quick-view';
import { EXPERIENCE_FIELDS } from '@/lib/curriculum/sections';
import type { CurriculumCorpus } from '@/lib/curriculum/types';
import { capitalize } from '@/lib/curriculum/text';

const SOURCE = path.resolve('curriculum/source/Malla_HT_Version_Final_Junio_2026.xlsx');
let wb: WorkbookCells;
let corpus: CurriculumCorpus;

function cellAt(ref: { sheet: string; cell: string }): string {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.cell)!;
  const col = m[1]!.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  return (wb.sheets[ref.sheet]?.[Number(m[2])]?.[col] ?? '').trim();
}

beforeAll(async () => {
  wb = await readWorkbook(SOURCE);
  corpus = parseWorkbook(wb);
});

describe('curriculum ingestion', () => {
  it('discovers the three workbook sheets', () => {
    expect(Object.keys(wb.sheets).sort()).toEqual(['Malla ajustada', 'Observaciones', 'Progresión por dimensión'].sort());
  });

  it('committed corpus is exactly what the importer produces from the source workbook', () => {
    expect(JSON.parse(JSON.stringify(corpus))).toEqual(committed);
  });

  it('is deterministic', () => {
    expect(parseWorkbook(wb)).toEqual(corpus);
  });

  it('imports 5 levels × 4 periods = 20 experiences, 30 progression summaries and 7 principles', () => {
    expect(corpus.levels.map((l) => l.name)).toEqual(['Step 1', 'Step 2', 'Step 3', 'Kínder', 'Transición']);
    expect(corpus.experiences).toHaveLength(20);
    expect(corpus.developmentSummaries).toHaveLength(30);
    expect(corpus.principles).toHaveLength(7);
  });

  it('preserves every curricular cell verbatim (parity with the workbook)', () => {
    const sheet = wb.sheets[SHEET_MALLA]!;
    for (const e of corpus.experiences) {
      expect(e.title).toBe(sheet[e.sourceRow]![9]!.trim());
      for (const f of EXPERIENCE_FIELDS) {
        expect(e.fields[f.key], `${e.id} ${f.key}`).toBe((sheet[e.sourceRow]![f.column] ?? '').trim());
        expect(e.fields[f.key].length, `${e.id} ${f.key} empty`).toBeGreaterThan(0);
      }
    }
    const totalSourceChars = corpus.experiences.reduce(
      (n, e) => n + EXPERIENCE_FIELDS.reduce((m, f) => m + e.fields[f.key].length, 0),
      0,
    );
    expect(totalSourceChars).toBeGreaterThan(100_000);
  });

  it('every chunk is a verbatim fragment of the cell it references', () => {
    for (const c of corpus.chunks) {
      const source = cellAt(c.sourceReference);
      expect(source.length, c.id).toBeGreaterThan(0);
      expect(source.includes(c.content), `${c.id} not verbatim in ${c.sourceReference.cell}`).toBe(true);
    }
  });

  it('chunks jointly cover all content of every source cell (nothing dropped)', () => {
    const byCell = new Map<string, string[]>();
    for (const c of corpus.chunks) {
      const key = `${c.sourceReference.sheet}!${c.sourceReference.cell}`;
      byCell.set(key, [...(byCell.get(key) ?? []), c.content]);
    }
    for (const [key, contents] of byCell) {
      const [sheet, cell] = key.split('!') as [string, string];
      let rest = cellAt({ sheet, cell });
      for (const content of contents) rest = rest.replace(content, '');
      expect(rest.trim(), key).toBe('');
    }
    // All 24 curricular columns of all 20 experiences are represented.
    const expCells = [...byCell.keys()].filter((k) => k.startsWith(SHEET_MALLA) && !/!(F|G)\d+$/.test(k));
    expect(expCells).toHaveLength(20 * 24);
  });

  it('marks every chunk as institutional with a content hash and version', () => {
    for (const c of corpus.chunks) {
      expect(c.authority).toBe('institutional');
      expect(c.contentHash).toMatch(/^[0-9a-f]{16}$/);
      expect(c.curriculumVersion).toBe(corpus.version.id);
    }
    expect(corpus.version.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('stable canonical IDs', () => {
  it('uses unique IDs with the documented format', () => {
    const ids = corpus.chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^HT-((S1|S2|S3|K|T)-(P[1-4]-[A-Z]+(-[A-Z0-9]+)?|PERFIL-(ENT|SAL)|DIM-[A-Z]{3})|INST-PRIN-\d{2})$/);
    }
  });

  it('keeps known IDs bound to the same source cells', () => {
    const byId = new Map(corpus.chunks.map((c) => [c.id, c]));
    expect(corpus.experiences.find((e) => e.id === 'HT-S2-P3')?.title).toBe('Mis palabras cuentan lo que vivo');
    expect(byId.get('HT-S2-P3-AR-LIT')?.sourceReference.cell).toBe('R8');
    expect(byId.get('HT-S2-P3-DUA')?.sourceReference.cell).toBe('X8');
    expect(byId.get('HT-T-P4-FAM')?.sourceReference.cell).toBe('AF21');
    expect(byId.get('HT-K-DIM-COG')?.sourceReference).toMatchObject({ sheet: 'Progresión por dimensión', cell: 'B5' });
    expect(byId.get('HT-INST-PRIN-03')?.content).toBe('Las alertas no son diagnósticos.');
    expect(byId.get('HT-S1-P1-PROP-02')?.content.startsWith('2. Las niñas y los niños son comunicadores activos')).toBe(true);
    expect(byId.get('HT-S2-P3-ALR')?.content.startsWith('Alertas:')).toBe(true);
  });
});

describe('structural drift detection', () => {
  it('fails loudly when a header changes', () => {
    const broken: WorkbookCells = structuredClone(wb);
    broken.sheets[SHEET_MALLA]![1]![24] = 'DUA';
    expect(() => parseWorkbook(broken)).toThrow(CurriculumImportError);
  });

  it('fails loudly when an activity loses its Tema/Competencia structure', () => {
    const broken: WorkbookCells = structuredClone(wb);
    broken.sheets[SHEET_MALLA]![5]![16] = 'Juego libre';
    expect(() => parseWorkbook(broken)).toThrow(/Tema\/Competencia/);
  });
});

describe('quick view synthesis', () => {
  it('only contains verbatim fragments of the referenced official chunks', () => {
    const byId = new Map(corpus.chunks.map((c) => [c.id, c]));
    for (const e of corpus.experiences) {
      const sections = buildQuickView(e);
      expect(sections.map((s) => s.title)).toEqual([
        'Qué buscamos',
        'Cómo podemos vivirlo',
        'Qué podemos observar',
        'Otras formas de participación',
        'Cómo conectar con las familias',
      ]);
      for (const s of sections) {
        for (const b of [...(s.lead ? [s.lead] : []), ...s.bullets]) {
          const chunk = byId.get(b.sourceId);
          expect(chunk, b.sourceId).toBeDefined();
          const text = b.text.replace(/^(Juego|Exploración del medio|Literatura|Arte): /, '');
          const haystack = capitalize(chunk!.content);
          const found = haystack.includes(text) || chunk!.content.includes(text.charAt(0).toLowerCase() + text.slice(1));
          expect(found, `${b.sourceId}: ${text}`).toBe(true);
        }
        expect(s.bullets.length + (s.lead ? 1 : 0)).toBeGreaterThan(0);
      }
    }
  });
});
