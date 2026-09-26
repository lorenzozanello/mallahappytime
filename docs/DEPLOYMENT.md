# Despliegue

Flujo: GitHub → rama/PR → CI (`.github/workflows/ci.yml`: corpus al día, typecheck, lint, unit, eval de recuperación, build, migraciones+RLS en Postgres, e2e) → Vercel Preview → verificación → producción.

## 1. Supabase
1. Crear proyecto (región cercana a Colombia, p. ej. `us-east-1`).
2. Aplicar migraciones: `supabase link --project-ref <ref>` y `supabase db push` (o pegar `supabase/migrations/*.sql` en el SQL editor, en orden).
3. Cargar el currículo: ejecutar `supabase/seed.sql` (idempotente) — p. ej. `psql "$DATABASE_URL" -f supabase/seed.sql`.
4. Auth → URL Configuration: *Site URL* = dominio de producción; *Redirect URLs* incluye `https://<dominio>/auth/confirm` y las URL de preview de Vercel.
5. Auth → Email Templates (Magic Link): usar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
6. Crear/invitar usuarias (Auth → Users). Asignar el primer admin por SQL: `update public.profiles set role = 'admin' where id = '<uuid>';` El resto de roles se gestiona en `/admin`.
7. (Opcional, búsqueda semántica) `NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… AI_GATEWAY_API_KEY=… npm run curriculum:embed`.

## 2. Vercel
1. Importar el repositorio (framework Next.js; `vercel.json` fija 60 s para `/api/happy*`).
2. Variables de entorno (ver `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `HAPPY_MODEL`, y credencial de IA (AI Gateway: habilitar en el proyecto; OIDC funciona sin clave, o `AI_GATEWAY_API_KEY`). **No** poner `HAPPY_DEMO_MODE` en producción.
3. Para una vista previa sin Supabase: `HAPPY_DEMO_MODE=true` (+ opcional `HAPPY_MODEL=mock/grounded`). Los datos se guardan en `/tmp` y no persisten entre instancias; la UI lo advierte.
4. Verificar `GET /api/health` (`backend: "supabase"`, versión curricular y nº de fragmentos) y `/admin` (base sincronizada ✓, modelo activo).

## 3. Actualizar la malla
Reemplazar el Excel en `curriculum/source/` → `npm run curriculum:import` → revisar `curriculum/IMPORT_REPORT.md` y `npm test` → PR → tras desplegar, ejecutar el nuevo `supabase/seed.sql` y `npm run curriculum:embed`. `/admin` indica si la base está desincronizada.
