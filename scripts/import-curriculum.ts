/**
 * Reproducible curriculum import.
 *
 *   npm run curriculum:import   → regenerates the corpus + Supabase seed from the workbook
 *   npm run curriculum:check    → fails if generated files are out of date (used in CI)
 *
 * The workbook in curriculum/source/ is the immutable source of truth.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseWorkbook } from '../src/lib/curriculum/import/parse';
import { readWorkbook } from '../src/lib/curriculum/import/read-workbook';
import { corpusToSql } from '../src/lib/curriculum/import/sql';

export const SOURCE_WORKBOOK = path.resolve('curriculum/source/Malla_HT_Version_Final_Junio_2026.xlsx');
const CORPUS_OUT = path.resolve('src/lib/curriculum/generated/corpus.json');
const SEED_OUT = path.resolve('supabase/seed.sql');
const REPORT_OUT = path.resolve('curriculum/IMPORT_REPORT.md');

async function main() {
  const check = process.argv.includes('--check');
  const corpus = parseWorkbook(await readWorkbook(SOURCE_WORKBOOK));

  const corpusJson = JSON.stringify(corpus, null, 1) + '\n';
  const seedSql = corpusToSql(corpus);
  const report = [
    '# Informe de importación curricular',
    '',
    '_Generado automáticamente por `npm run curriculum:import`._',
    '',
    `- Fuente: \`${corpus.version.sourceFile}\``,
    `- SHA-256: \`${corpus.version.sourceSha256}\``,
    `- Versión: \`${corpus.version.id}\` — ${corpus.version.label}`,
    `- Niveles: ${corpus.levels.length} (${corpus.levels.map((l) => l.name).join(', ')})`,
    `- Experiencias integradoras: ${corpus.experiences.length}`,
    `- Resúmenes de progresión (nivel × dimensión): ${corpus.developmentSummaries.length}`,
    `- Principios institucionales: ${corpus.principles.length}`,
    `- Fragmentos recuperables (chunks): ${corpus.chunks.length}`,
    '',
    '## Ambigüedades y normalizaciones',
    '',
    ...corpus.issues.map((i) => `- **${i.kind === 'ambiguity' ? 'Ambigüedad' : 'Normalización'}** (${i.location}): ${i.description}`),
    '',
  ].join('\n');

  const outputs: [string, string][] = [
    [CORPUS_OUT, corpusJson],
    [SEED_OUT, seedSql],
    [REPORT_OUT, report],
  ];

  if (check) {
    const stale: string[] = [];
    for (const [file, content] of outputs) {
      const current = await readFile(file, 'utf8').catch(() => '');
      if (current !== content) stale.push(path.relative(process.cwd(), file));
    }
    if (stale.length) {
      console.error(`Archivos curriculares desactualizados: ${stale.join(', ')}. Ejecuta npm run curriculum:import.`);
      process.exit(1);
    }
    console.log(`Corpus curricular al día (${corpus.chunks.length} fragmentos).`);
    return;
  }

  for (const [file, content] of outputs) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  console.log(
    `Importadas ${corpus.experiences.length} experiencias, ${corpus.chunks.length} fragmentos, ${corpus.issues.length} notas de importación.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
