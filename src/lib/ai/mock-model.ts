import { MockLanguageModelV4 } from 'ai/test';

/**
 * Deterministic TEST model (HAPPY_MODEL=mock/grounded). It is used only for
 * automated tests and credential-less demo previews, and every response it
 * produces is visibly marked as simulated in the UI (meta.route === 'mock').
 * It builds a schema-valid answer from the evidence IDs present in the prompt,
 * so the full pipeline (retrieval → prompt → validation → UI) is exercised.
 */
export function createGroundedMockModel() {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'grounded',
    doGenerate: async (options) => {
      const prompt = JSON.stringify(options.prompt);
      const text = prompt.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      const ids = [...new Set([...text.matchAll(/\[(HT-[A-Z0-9-]+)\]/g)].map((m) => m[1]!))];
      const message = /<mensaje>\n([\s\S]*?)\n<\/mensaje>/.exec(text)?.[1]?.trim() ?? '';
      const json = /ASISTENCIA DE CAMPO/.test(text)
        ? fieldAssist(ids)
        : /Etapa: DESARROLLO/.test(text)
          ? develop(ids, /camino elegido por la docente: «([^»]+)»/.exec(text)?.[1] ?? 'Camino elegido')
          : /Etapa: CONEXIÓN/.test(text)
            ? connect(ids, message)
            : paths(ids, message);
      const out = JSON.stringify(json);
      return {
        content: [{ type: 'text', text: out }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: Math.ceil(prompt.length / 4), noCache: Math.ceil(prompt.length / 4), cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: Math.ceil(out.length / 4), text: Math.ceil(out.length / 4), reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

const PREFIX = '[Respuesta simulada de prueba]';

function paths(ids: string[], message: string) {
  const [a, b, c] = ids;
  return {
    understanding: `${PREFIX} Entiendo que buscas: “${message.slice(0, 120)}”.`,
    options: [
      { title: 'Camino desde la malla', description: 'Retoma directamente lo que propone la experiencia actual.', sourceType: 'institutional', sourceIds: a ? [a] : [] },
      { title: 'Camino complementario', description: 'Una idea nueva de prueba conectada con la malla.', sourceType: 'generated', sourceIds: b ? [b] : [] },
      // Deliberately cites an unknown ID to exercise validation (it must be dropped).
      { title: 'Camino con referencia inválida', description: 'Referencia inexistente para probar la validación.', sourceType: 'institutional', sourceIds: ['HT-X-P9-FAKE'] },
    ],
    development: null,
    curriculumLinks: [a, c].filter(Boolean).map((id) => ({ sourceId: id, why: 'Relación de prueba con la evidencia.' })),
    insufficientEvidence: ids.length === 0,
    nextStep: '¿Cuál camino quieres desarrollar?',
  };
}

function develop(ids: string[], title: string) {
  const [a, b] = ids;
  return {
    understanding: `${PREFIX} Desarrollo el camino «${title}».`,
    options: [],
    development: {
      title,
      sections: [
        { key: 'inicio', items: [{ text: 'Provocación inicial de prueba.', sourceType: 'generated', sourceIds: [] }] },
        { key: 'desarrollo', items: [{ text: 'Acción tomada de la malla (prueba).', sourceType: 'institutional', sourceIds: a ? [a] : [] }] },
        { key: 'preguntas', items: [{ text: '¿Qué notaste? (pregunta de prueba)', sourceType: 'generated', sourceIds: [] }] },
        { key: 'observar', items: [{ text: 'Manifestación observable de prueba.', sourceType: 'institutional', sourceIds: b ? [b] : [] }] },
      ],
    },
    curriculumLinks: a ? [{ sourceId: a, why: 'Base del camino (prueba).' }] : [],
    insufficientEvidence: false,
    nextStep: '¿Quieres guardarlo o convertirlo en planeación?',
  };
}

function connect(ids: string[], message: string) {
  return {
    understanding: `${PREFIX} Buscas la relación de “${message.slice(0, 100)}” con la malla.`,
    options: [],
    development: null,
    curriculumLinks: ids.slice(0, 4).map((id) => ({ sourceId: id, why: 'Fragmento relacionado (prueba).' })),
    insufficientEvidence: ids.length === 0,
    nextStep: '¿Quieres que te proponga ideas a partir de alguno de estos fragmentos?',
  };
}

function fieldAssist(ids: string[]) {
  return {
    items: [
      { text: 'Sugerencia de prueba basada en la malla.', sourceType: 'institutional', sourceIds: ids.slice(0, 1) },
      { text: 'Sugerencia complementaria de prueba.', sourceType: 'generated', sourceIds: [] },
    ],
    note: `${PREFIX}`,
  };
}
