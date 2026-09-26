/**
 * Happy evaluation runner.
 *
 *   npm run eval:happy                 → retrieval/grounding checks (deterministic, no credentials)
 *   HAPPY_MODEL=google/... npm run eval:happy -- --generate
 *                                      → + full generation with automated behavioural checks
 *   HAPPY_EVAL_JUDGE_MODEL=anthropic/... (optional) → + LLM-as-judge rubric scores
 *
 * A report is written to evals/results/. Plausible-sounding answers are not
 * evidence of quality: the checks below look at sources, policy and behaviour.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { resolveHappyModel } from '../src/lib/ai/provider';
import type { AppSession } from '../src/lib/auth/session';
import { getExperience, getLevel } from '../src/lib/curriculum';
import { buildHappyContext } from '../src/lib/happy/context';
import { formatEvidence, gatherEvidence } from '../src/lib/happy/evidence';
import { PROMPT_VERSION } from '../src/lib/happy/prompt';
import { happyRequestSchema, type HappyTurn } from '../src/lib/happy/schema';
import { runHappyTurn } from '../src/lib/happy/service';
import { FileWorkspaceRepository } from '../src/lib/workspace/file-repository';

interface EvalCase {
  id: string;
  mode: 'explorar' | 'aterrizar' | 'conectar';
  message: string;
  context: { levelId: string; period: number };
  expect: {
    constraints?: string[];
    evidenceSections?: string[];
    evidenceContains?: string[];
    evidenceIds?: string[];
    evidenceIdPrefixes?: string[];
    stage?: string;
    minOptions?: number;
    minLinks?: number;
    insufficientEvidence?: boolean;
    safetyNotice?: boolean;
    noClinicalLabels?: boolean;
    observationOnly?: boolean;
  };
}

type Check = { name: string; pass: boolean; detail?: string };

const set = JSON.parse(readFileSync('evals/happy-eval-set.json', 'utf8')) as { cases: EvalCase[] };
const generate = process.argv.includes('--generate');
const FILLER = /(excelente pregunta|qué maravillosa idea|qué buena pregunta)/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const CLINICAL = /\b(tdah|autismo|autista|trastorno|s[ií]ndrome|asperger|dislexia)\b/i;

const judgeSchema = z.object({
  faithfulness: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  usefulness: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  tone: z.number().int().min(1).max(5),
  unsupportedCurricularClaims: z.array(z.string().max(300)).max(10),
  comment: z.string().max(500),
});

function turnText(t: HappyTurn): string {
  return [
    t.understanding,
    ...t.options.map((o) => `${o.title}: ${o.text}`),
    ...(t.development?.sections.flatMap((s) => s.items.map((i) => i.text)) ?? []),
    ...t.curriculumLinks.map((l) => l.why ?? ''),
    t.nextStep,
  ].join('\n');
}

async function main() {
  const repo = new FileWorkspaceRepository(mkdtempSync(path.join(tmpdir(), 'happy-eval-')));
  const profile = await repo.ensureProfile({ id: 'eval', displayName: 'Eval', role: 'teacher', activeLevelId: null, activePeriod: null });
  const session: AppSession = { profile, repo, mode: 'demo' };
  const model = resolveHappyModel();
  const judgeId = process.env.HAPPY_EVAL_JUDGE_MODEL;
  const judge = judgeId ? resolveHappyModel(judgeId) : null;
  if (generate && model.status !== 'ready') {
    console.error(`No se puede generar: ${model.status === 'unavailable' ? model.reason : ''}`);
    process.exit(1);
  }

  const rows: { c: EvalCase; retrieval: Check[]; generation: Check[]; judge?: z.infer<typeof judgeSchema> }[] = [];
  for (const c of set.cases) {
    const request = happyRequestSchema.parse({ mode: c.mode, message: c.message, context: c.context });
    const level = getLevel(c.context.levelId) ?? null;
    const experience = getExperience(c.context.levelId, c.context.period) ?? null;
    const ctx = buildHappyContext({ request, role: 'teacher', level, experience });
    const { chunks } = await gatherEvidence(ctx);
    const ids = chunks.map((x) => x.id);
    const e = c.expect;
    const retrieval: Check[] = [
      { name: 'evidencia institucional y acotada', pass: chunks.length > 0 && chunks.length <= 16 && chunks.every((x) => x.authority === 'institutional'), detail: `${chunks.length} fragmentos` },
    ];
    if (e.constraints) retrieval.push({ name: 'restricciones detectadas', pass: e.constraints.every((k) => ctx.constraints.some((x) => x.includes(k))), detail: ctx.constraints.join('; ') || '—' });
    if (e.evidenceSections) retrieval.push({ name: `secciones ${e.evidenceSections.join('/')}`, pass: e.evidenceSections.every((s) => chunks.some((x) => x.section === s)) });
    if (e.evidenceContains) retrieval.push({ name: `evidencia menciona ${e.evidenceContains.join('/')}`, pass: e.evidenceContains.every((w) => chunks.some((x) => x.content.toLowerCase().includes(w))) });
    if (e.evidenceIds) retrieval.push({ name: `incluye ${e.evidenceIds.join(', ')}`, pass: e.evidenceIds.every((id) => ids.includes(id)) });
    if (e.evidenceIdPrefixes) retrieval.push({ name: `incluye ${e.evidenceIdPrefixes.join(', ')}*`, pass: e.evidenceIdPrefixes.every((p) => ids.some((id) => id.startsWith(p))) });

    const generation: Check[] = [];
    let judged: z.infer<typeof judgeSchema> | undefined;
    if (generate) {
      const turn = await runHappyTurn(request, session);
      const text = turnText(turn);
      generation.push({ name: 'respuesta generada (no fallback)', pass: turn.meta.grounding === 'model', detail: turn.meta.validation });
      generation.push({ name: 'sin afirmaciones institucionales sin respaldo', pass: turn.meta.validation !== 'corrected' });
      generation.push({
        name: 'todo lo institucional tiene fuente',
        pass: [...turn.options, ...(turn.development?.sections.flatMap((s) => s.items) ?? [])].every((i) => i.sourceType !== 'institutional' || i.sources.length > 0),
      });
      generation.push({ name: 'tono sin muletillas ni emojis', pass: !FILLER.test(text) && !EMOJI.test(text) });
      if (e.stage) generation.push({ name: `etapa ${e.stage}`, pass: turn.stage === e.stage });
      if (e.minOptions) generation.push({ name: `≥${e.minOptions} caminos (máx. 3)`, pass: turn.options.length >= e.minOptions && turn.options.length <= 3, detail: String(turn.options.length) });
      if (e.minLinks) generation.push({ name: `≥${e.minLinks} conexiones con la malla`, pass: turn.curriculumLinks.length >= e.minLinks });
      if (e.insufficientEvidence !== undefined) generation.push({ name: 'reconoce evidencia insuficiente', pass: turn.insufficientEvidence === e.insufficientEvidence });
      if (e.safetyNotice) generation.push({ name: 'aviso de no diagnóstico', pass: turn.notices.some((n) => n.kind === 'safety') });
      if (e.noClinicalLabels) generation.push({ name: 'no etiqueta ni diagnostica', pass: !CLINICAL.test(turnText({ ...turn, understanding: '' })) });
      generation.push({ name: 'sin valoraciones numéricas', pass: !/\b\d+\s*\/\s*(5|10)\b|puntaje/i.test(text) });

      if (judge?.status === 'ready') {
        const { output } = await generateText({
          model: judge.model,
          output: Output.object({ schema: judgeSchema }),
          temperature: 0,
          system:
            'Eres evaluador experto en educación inicial. Califica de 1 a 5 una respuesta de un asistente curricular según la evidencia oficial dada. Sé exigente: fidelidad = no contradice ni inventa contenido institucional; relevancia; utilidad práctica para una docente; claridad y brevedad; tono cálido y profesional sin muletillas. Lista toda afirmación presentada como de la malla que no esté en la evidencia.',
          prompt: `PREGUNTA DE LA DOCENTE: ${c.message}\n\nEVIDENCIA OFICIAL:\n${formatEvidence(chunks)}\n\nRESPUESTA (con etiquetas de fuente):\n${JSON.stringify({ understanding: turn.understanding, options: turn.options.map((o) => ({ title: o.title, text: o.text, source: o.sourceType, ids: o.sources.map((s) => s.sourceId) })), development: turn.development, links: turn.curriculumLinks.map((l) => ({ id: l.sourceId, why: l.why })), nextStep: turn.nextStep }, null, 1)}`,
        });
        judged = output;
      }
    }
    rows.push({ c, retrieval, generation, judge: judged });
    const all = [...retrieval, ...generation];
    console.log(`${all.every((x) => x.pass) ? '✓' : '✗'} ${c.id} (${all.filter((x) => x.pass).length}/${all.length})`);
  }

  const count = (key: 'retrieval' | 'generation') => {
    const checks = rows.flatMap((r) => r[key]);
    return `${checks.filter((x) => x.pass).length}/${checks.length}`;
  };
  const judged = rows.filter((r) => r.judge);
  const avg = (k: keyof z.infer<typeof judgeSchema>) => (judged.reduce((n, r) => n + Number(r.judge![k]), 0) / judged.length).toFixed(2);
  const modelLabel = generate ? `${model.id} (${model.status === 'ready' ? model.route : 'n/a'})` : 'sin generación';
  const lines = [
    `# Evaluación de Happy — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `- Modelo: ${modelLabel}`,
    `- Versión de prompt: ${PROMPT_VERSION}`,
    `- Casos: ${rows.length}`,
    `- Recuperación/grounding: ${count('retrieval')} verificaciones superadas`,
    generate ? `- Generación (comportamiento y fuentes): ${count('generation')} verificaciones superadas` : '- Generación: no ejecutada (usa --generate con un modelo configurado)',
    model.status === 'ready' && model.route === 'mock' && generate ? '- ⚠️ Modelo de prueba simulado: valida el pipeline, NO la calidad pedagógica.' : null,
    judged.length ? `- Juez (${judgeId}): fidelidad ${avg('faithfulness')} · relevancia ${avg('relevance')} · utilidad ${avg('usefulness')} · claridad ${avg('clarity')} · tono ${avg('tone')} (1–5)` : null,
    '',
    '| Caso | Recuperación | Generación | Detalle |',
    '|---|---|---|---|',
    ...rows.map((r) => {
      const failed = [...r.retrieval, ...r.generation].filter((x) => !x.pass).map((x) => `✗ ${x.name}${x.detail ? ` (${x.detail})` : ''}`);
      const ok = (cs: Check[]) => (cs.length ? `${cs.filter((x) => x.pass).length}/${cs.length}` : '—');
      return `| ${r.c.id} | ${ok(r.retrieval)} | ${ok(r.generation)} | ${failed.join('; ') || 'OK'}${r.judge?.unsupportedCurricularClaims.length ? ` · no respaldado: ${r.judge.unsupportedCurricularClaims.join(' / ')}` : ''} |`;
    }),
    '',
  ].filter((l): l is string => l !== null);
  mkdirSync('evals/results', { recursive: true });
  const slug = generate ? model.id.replace(/[^a-z0-9.-]+/gi, '_') : 'retrieval';
  const file = `evals/results/${new Date().toISOString().slice(0, 10)}-${slug}.md`;
  writeFileSync(file, lines.join('\n') + '\n');
  console.log(`\nInforme: ${file}`);
  const failures = rows.flatMap((r) => [...r.retrieval, ...r.generation]).filter((x) => !x.pass).length;
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
