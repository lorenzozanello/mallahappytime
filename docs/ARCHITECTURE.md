# Arquitectura

```
Excel oficial ──(npm run curriculum:import)──► corpus.json (app)  +  supabase/seed.sql (BD)
                                                   │
Docente ─► Next.js (App Router, RSC) ─► Malla / Inicio / Guardados (server components + server actions)
          │
          └─► /api/happy ─► Context Builder ─► Curriculum Retrieval ─► Prompt (política) ─► Modelo (AI SDK)
                                                                         ─► Validación de salida ─► Turno estructurado ─► UI
```

## Módulos (`src/lib`)
| Módulo | Responsabilidad |
|---|---|
| `curriculum/` | Tipos, secciones del Excel, acceso al corpus (`index.ts`, solo servidor), *Vista rápida* (`quick-view.ts`), importador (`import/`). |
| `retrieval/` | Búsqueda híbrida compartida por Malla y Happy (`engine.ts` puro; `index.ts` conecta la pierna semántica). |
| `happy/` | Modos, esquemas Zod, constructor de contexto, evidencia, prompt, validación/política, servicio, ideas guardadas. |
| `ai/` | Abstracción de proveedor (`HAPPY_MODEL`), modelo simulado de pruebas. |
| `workspace/` | Repositorio de guardados/planeaciones/eventos: Supabase (RLS) o archivo (solo demo). |
| `auth/` | Sesión por solicitud (Supabase Auth o demo), roles y guardas. |

## Datos
- El currículo es **estático y versionado**: la app lo sirve desde el corpus generado (sin consulta a BD para leer la malla). Supabase guarda el mismo corpus (mismos IDs y hashes) para la búsqueda semántica y FTS, y todo lo privado de las docentes.
- Guardados, planeaciones, perfiles y observabilidad viven en Supabase con RLS (`supabase/migrations`).

## Búsqueda híbrida
1. **Filtros de metadatos** (nivel, periodo, experiencia, sección).
2. **BM25 léxico** en proceso sobre los 587 fragmentos (normalización de acentos, stemming ligero).
3. **Vocabulario docente** (`retrieval/concepts.ts`): "actividades literarias", "qué observar", "turnos"… se traducen a secciones y términos de la malla (metadatos, nunca contenido).
4. **Pierna de base de datos** (si hay Supabase + embeddings): RPC `match_curriculum_chunks` con similitud vectorial (pgvector/HNSW) y rango FTS en español.
5. **Fusión RRF** + refuerzo por contexto de la docente + tope de resultados por experiencia.
Malla y Happy usan el mismo motor y corpus; cambian solo las opciones (límites, contexto).

## Happy (flujo de un turno)
`service.ts`: resuelve contexto (experiencia por ID o nivel+periodo) → `buildHappyContext` (modo, etapa, restricciones explícitas, resumen corto) → `gatherEvidence` (secciones clave de la experiencia según modo + resultados de búsqueda; máx. 16 fragmentos) → `generateText` con `Output.object(schema)` → `validateModelOutput` → registro de metadatos → `HappyTurn`. Sin modelo o ante error, responde en modo **solo malla** con aviso visible.

## Autenticación y roles
Supabase Auth (contraseña o enlace mágico; cuentas creadas por la institución). `src/proxy.ts` refresca la sesión; la autorización real está en `requireSession/requireRole` y en RLS. Roles: `teacher`, `coordinator`, `admin`. Modo demo explícito (`HAPPY_DEMO_MODE=true`) para desarrollo y vistas previas sin credenciales.
