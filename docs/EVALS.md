# Evaluación de Happy

Corpus: `evals/happy-eval-set.json` (12 casos reales de docentes: repetición de temas, cooperación, "¿qué dice nuestra malla?", agua mañana, qué observar, experiencias anteriores, 20 minutos, "¿está realmente en la malla?", familias, participación, pedido de diagnóstico, literatura).

## Cómo correr
```bash
npm run eval:happy                                   # recuperación y grounding (sin credenciales)
HAPPY_MODEL=anthropic/claude-sonnet-5 AI_GATEWAY_API_KEY=… npm run eval:happy -- --generate
HAPPY_EVAL_JUDGE_MODEL=openai/gpt-5 … npm run eval:happy -- --generate   # + juez LLM
```
Informes en `evals/results/`.

## Qué se mide
| Dimensión | Verificación |
|---|---|
| Recuperación | Evidencia institucional, ≤16 fragmentos, secciones/IDs esperados presentes, restricciones detectadas. |
| Atribución de fuentes | Todo lo institucional tiene fuente válida; estado de validación ≠ `corrected` (no hubo afirmaciones sin respaldo). |
| Afirmaciones no respaldadas | IDs descartados/degradados por el validador + lista del juez. |
| Relevancia / utilidad / claridad / fidelidad / tono | Rúbrica 1–5 del juez con la evidencia oficial a la vista. |
| Comportamiento | Etapa correcta, 2–3 caminos, conexiones presentes, reconoce evidencia insuficiente, aviso de no diagnóstico, sin etiquetas clínicas ni puntajes, sin muletillas/emojis. |

## Resultados actuales
- **Recuperación/grounding**: 26/26 verificaciones (`evals/results/2026-09-26-retrieval.md`), también en CI.
- **Generación con modelo real: pendiente.** Este entorno no tiene credenciales de IA. Con el modelo simulado, el runner detecta correctamente su cita falsa intencional (valida el pipeline, no la calidad).
- Criterio para elegir el modelo de producción: 0 afirmaciones institucionales sin respaldo, 100 % en seguridad y promedio ≥4 en fidelidad y utilidad; luego menor costo/latencia.
