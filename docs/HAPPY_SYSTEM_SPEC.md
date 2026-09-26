# Happy · especificación del sistema

**Asistente curricular de Happy Time** — "una compañera para pensar, conectar y aterrizar experiencias". Cálida, clara, práctica, cercana; sin muletillas, sin diagnósticos, sin autoridad sobre la docente.

## Modos (V1)
| Modo | Para | Etapa inicial |
|---|---|---|
| Explorar | "Necesito ideas" | caminos (2–3) |
| Aterrizar | "Tengo una idea; ayúdame a desarrollarla" | caminos (2–3) |
| Conectar | "¿Cómo se relaciona esto con nuestra malla?" | conexión |

Elegir un camino dispara la etapa **desarrollo** (inicio, cómo vivirlo, preguntas, materiales, participación, qué observar, familias, cierre). Adaptar / Observar / Registrar están declarados (deshabilitados) en `src/lib/happy/modes.ts`: se agregan con una entrada del registro, sin reestructurar el flujo. La ayuda por campo de planeación ("Ayúdame con preguntas") usa `/api/happy/assist`.

## Contexto enviado al modelo
Rol, nivel (nombre, equivalencia, edades), periodo, experiencia (ID y título), modo, etapa, mensaje, restricciones explícitas extraídas de sus palabras (tiempo, lo ya trabajado, "mañana", materiales, espacio), resumen corto de la conversación (≤6 turnos) y el camino elegido. Nunca datos personales de niñas/niños ni todo el currículo.

## Evidencia
Secciones clave de la experiencia actual según el modo + resultados de la búsqueda híbrida con la misma frase de la docente; progresión del nivel anterior/actual cuando pregunta "qué precede"; máximo 16 fragmentos, delimitados como datos (`<evidencia>`), con su ID.

## Salida estructurada (Zod, `src/lib/happy/schema.ts`)
```json
{ "understanding": "…", "options": [{ "title": "…", "description": "…", "sourceType": "institutional|generated", "sourceIds": ["HT-…"] }],
  "development": { "title": "…", "sections": [{ "key": "inicio|desarrollo|…", "items": [{ "text": "…", "sourceType": "…", "sourceIds": [] }] }] } | null,
  "curriculumLinks": [{ "sourceId": "HT-…", "why": "…" }], "insufficientEvidence": false, "nextStep": "…" }
```
La UI construye la presentación (etiquetas, extractos oficiales, enlaces) desde el corpus; nunca se renderiza HTML del modelo.

## Validación (`validate.ts`)
IDs fuera de la evidencia del turno se eliminan; lo "institucional" sin fuente válida pasa a "generado"; nunca al revés; etiquetas y extractos salen del corpus; se eliminan muletillas; lenguaje clínico o valoraciones numéricas generan avisos de seguridad y el estado `safety_flag`.

## Proveedor y modelo
`HAPPY_MODEL="<proveedor>/<modelo>"` vía AI SDK (AI Gateway o clave directa). Por defecto `anthropic/claude-sonnet-5` (ver DECISIONS). `mock/grounded` es un modelo determinista solo para pruebas/demos y se marca "RESPUESTA SIMULADA". Sin credenciales: modo **solo malla**, visible.

## Observabilidad
`happy_events`: modo, modelo, versión de prompt (`PROMPT_VERSION`), latencia, nº de fragmentos, IDs de fuente, estado de validación, tokens, costo estimado (si se configuran precios), error, nivel/periodo. `happy_feedback`: útil/no útil y siguiente acción (guardó, planeó). **No** se guardan mensajes ni respuestas en la observabilidad; solo quedan en Guardados si la docente decide guardarlos.
