# Modelo de datos curricular

## Fuente
`curriculum/source/Malla_HT_Version_Final_Junio_2026.xlsx` (inmutable; SHA-256 registrado en el corpus y en `curriculum_versions`).

| Hoja | Contenido | Importado como |
|---|---|---|
| **Malla ajustada** (A1:AG21) | 5 niveles × 4 periodos = 20 experiencias; columnas A–G del nivel (combinadas cada 4 filas) y 24 columnas curriculares (J–AG). | `levels`, `experiences`, chunks |
| **Progresión por dimensión** (A1:G6) | 5 niveles × 6 dimensiones (cognitiva, comunicativa, socioemocional, corporal, estética, ético-moral). | `developmentSummaries`, chunks `progresion` |
| **Observaciones** (A2:A8) | 7 principios institucionales ("Las alertas no son diagnósticos", etc.). | `principles`, chunks `principio` |

Columnas curriculares por experiencia: alcance, propósitos esenciales, momentos (Indagar, Proyectar, Vivir, Valorar), actividades rectoras (Juego, Exploración del medio, Literatura, Arte — cada una con Tema/Competencia/Avance/Evidencia), núcleos, saberes y nociones, competencias, evidencias, DUA/apoyos/PIAR, Contexto Caribe, GIRE, procesos imprescindibles, ambientes saludables, indicadores, documentación y alertas, educación emocional, alianza familia-escuela, observación y valoración. El mapeo exacto está en `src/lib/curriculum/sections.ts`; el importador falla si un encabezado cambia.

## Entidades
- `curriculum_versions` — `ht-malla-2026-06`, archivo, hash, estado (una sola activa).
- `curriculum_levels` — `step-1`, `step-2`, `step-3`, `kinder`, `transicion` (códigos S1, S2, S3, K, T).
- `curriculum_experiences` — ID `HT-{nivel}-P{periodo}`, título, campos textuales, propósitos y actividades estructurados.
- `curriculum_development_summaries`, `curriculum_principles`.
- `curriculum_chunks` — unidad recuperable: `id, curriculum_version, level_id, period, experience_id, section, subsection, content, tags, authority='institutional', source_reference{file,sheet,cell}, content_hash, status, updated_at` (+ `fts`, `embedding`).

## IDs canónicos (estables)
| Patrón | Ejemplo |
|---|---|
| Experiencia | `HT-S2-P3` |
| Campo de experiencia | `HT-S2-P3-DUA`, `HT-S2-P3-AR-LIT`, `HT-S2-P3-INDI` |
| Propósito n | `HT-S2-P3-PROP-02` |
| Documentación / alertas | `HT-S2-P3-DOC`, `HT-S2-P3-ALR` |
| Perfil de nivel | `HT-K-PERFIL-ENT`, `HT-K-PERFIL-SAL` |
| Progresión | `HT-K-DIM-COG` |
| Principio | `HT-INST-PRIN-03` |

El ID no incluye la versión: identifica el mismo lugar curricular entre versiones; `content_hash` detecta cambios de texto (y en la BD invalida el embedding). Fragmentos que desaparezcan se marcan `retired`, no se borran.

## Normalización (sin alterar contenido)
- Recorte de espacios; celdas combinadas del nivel asignadas a sus 4 periodos.
- Propósitos divididos en sus 3 bloques; "Documentación pedagógica y alertas" dividida en el marcador `Alertas:`.
- Listas separadas por `;` (o `,` en núcleos/saberes) solo para mostrar viñetas; cada viñeta es una subcadena literal.

## Ambigüedades documentadas
Ver `curriculum/IMPORT_REPORT.md`: "Kínder" (hoja principal) vs "Jardín/Kínder" (progresión) vs equivalencia "Jardín" → mismo nivel; la malla no define fechas de periodos; los enunciados generales de los propósitos se repiten en las 20 experiencias.

## Integridad (pruebas)
`tests/unit/curriculum-import.test.ts`: el corpus versionado coincide exactamente con lo que produce el importador; cada campo coincide con su celda; cada chunk es subcadena literal de su celda; los chunks cubren el 100 % de cada celda; IDs únicos y con formato; IDs conocidos ligados a las mismas celdas; la importación falla ante cambios estructurales.
