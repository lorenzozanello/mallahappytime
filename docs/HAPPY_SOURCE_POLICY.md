# Política de fuentes de Happy

Una docente nunca debe preguntarse: *"¿Esto lo dice nuestra malla o lo generó Happy?"*

| Tipo | Etiqueta en la UI | Regla |
|---|---|---|
| `institutional` | **DESDE NUESTRA MALLA** (verde azulado, libro) | Contenido oficial o síntesis fiel de fragmentos de la evidencia del turno. Siempre con ≥1 ID válido; la UI muestra el extracto literal y enlaza a la ficha. |
| `generated` | **IDEA COMPLEMENTARIA DE HAPPY** (violeta, destello, borde punteado) | Sugerencia nueva coherente con el contexto; puede citar fragmentos con los que se conecta, pero no se presenta como malla. |
| `external` | **RECURSO EXTERNO** | Reservado (componente y tipo existen). No habilitado en V1: Happy no navega la web. |

Reglas de aplicación:
1. El modelo solo puede citar IDs que recibió como evidencia en ese turno; el validador descarta los demás.
2. Sin respaldo válido, lo institucional se degrada a generado y se muestra un aviso.
3. La relación explicada por Happy ("Relación (según Happy)") se distingue del extracto oficial.
4. Si la malla no alcanza, `insufficientEvidence` muestra: "La malla no trae información suficiente sobre esto…".
5. Ideas guardadas: al reabrirlas, las fuentes se reconstruyen desde el corpus por ID (un payload manipulado no puede fabricar una etiqueta oficial).
6. Planeaciones creadas desde Happy conservan la procedencia en línea: `[Malla HT-…]` o `[Idea de Happy]`.
7. La *Vista rápida* no usa IA: solo fragmentos literales con su ID.
