# Happy Time · Plataforma curricular + Happy

Espacio de trabajo diario para las docentes de Happy Time: la malla curricular institucional, fácil de encontrar y entender desde el celular, y **Happy**, el asistente curricular que ayuda a aterrizar experiencias sin reemplazar el criterio docente.

> **La docente conduce. Happy amplía posibilidades.**

## Qué incluye

| Área | Qué hace |
|---|---|
| **Inicio** | Nivel y periodo activos, experiencia actual resumida, acceso a Happy y trabajo reciente. |
| **Malla** | Navegación nivel → periodo → experiencia, búsqueda en lenguaje natural, *Vista rápida* y *Ficha completa*. |
| **Happy** | Modos Explorar / Aterrizar / Conectar, con contexto automático, caminos → desarrollo, fuentes visibles. |
| **Guardados** | Favoritos, ideas de Happy y planeaciones editables (con ayuda de Happy por campo). |
| Secundario | Progresión por dimensión, vista institucional pública, coordinación y administración. |

Todo el contenido curricular proviene del Excel oficial (`curriculum/source/`) mediante una importación reproducible. Lo que dice la malla aparece como **Desde nuestra malla**; lo que propone Happy, como **Idea complementaria de Happy**.

## Empezar

```bash
npm install
cp .env.example .env.local   # para probar sin credenciales: HAPPY_DEMO_MODE=true y HAPPY_MODEL=mock/grounded
npm run dev
```

Scripts principales:

| Comando | Uso |
|---|---|
| `npm run curriculum:import` | Regenera corpus, seed SQL e informe desde el Excel. `curriculum:check` verifica que estén al día. |
| `npm test` | Pruebas unitarias/integración (Vitest): ingesta y paridad, IDs, búsqueda, Happy, guardados, roles. |
| `npm run test:e2e` | Recorridos docentes en móvil y escritorio (Playwright). |
| `npm run db:verify` | Aplica migraciones + seed en un Postgres local desechable y verifica RLS. |
| `npm run eval:happy` | Evaluación de Happy (recuperación siempre; `-- --generate` con un modelo real). |
| `npm run curriculum:embed` | Calcula embeddings en Supabase (búsqueda semántica). |

## Documentación

- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — alcance del producto y recorridos.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — módulos, flujo de Happy, búsqueda híbrida.
- [docs/CURRICULUM_DATA_MODEL.md](docs/CURRICULUM_DATA_MODEL.md) — hojas, entidades, IDs canónicos.
- [docs/HAPPY_SYSTEM_SPEC.md](docs/HAPPY_SYSTEM_SPEC.md) y [docs/HAPPY_SOURCE_POLICY.md](docs/HAPPY_SOURCE_POLICY.md).
- [docs/SECURITY.md](docs/SECURITY.md), [docs/EVALS.md](docs/EVALS.md), [docs/DECISIONS.md](docs/DECISIONS.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- [curriculum/IMPORT_REPORT.md](curriculum/IMPORT_REPORT.md) — resultado de la última importación.

Desarrollado por The Balance Corp para Happy Time · Centro Educativo Infantil (Barranquilla).
