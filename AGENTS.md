# Guía para agentes

- Next.js 16 (App Router). Antes de usar APIs de Next, consulta la documentación incluida en `node_modules/next/dist/docs/` (Middleware se llama **Proxy**: `src/proxy.ts`; `params`/`searchParams` son Promises). AI SDK v7: `node_modules/ai/docs/` (`generateText` + `Output.object`).
- **Nunca** escribas contenido curricular a mano en componentes. El currículo sale solo de `src/lib/curriculum/generated/corpus.json`, generado por `npm run curriculum:import` desde `curriculum/source/*.xlsx`. No edites el JSON ni `supabase/seed.sql` a mano.
- Toda salida de Happy pasa por `src/lib/happy/validate.ts`. No renderices HTML del modelo; la UI controla la presentación.
- Fuentes: `institutional` requiere IDs de la evidencia del turno; nada se "promueve" a institucional.
- Antes de terminar: `npm run typecheck && npm run lint && npm test && npm run curriculum:check`; para cambios de UI, `npm run test:e2e`; para SQL, `npm run db:verify`.
- Textos de interfaz en español (Colombia), trato de "tú".
