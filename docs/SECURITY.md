# Seguridad y privacidad

- **Secretos**: claves de IA y `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor (`src/lib/config.ts` importa `server-only`). El cliente solo recibe la URL y la clave pública de Supabase. `.env*` está en `.gitignore`.
- **Mínimo privilegio**: la app usa el cliente de Supabase con la sesión de la docente (RLS aplica siempre). La service role solo se usa en `scripts/embed-curriculum.ts`.
- **RLS** (`supabase/migrations/…_workspace.sql`), verificada con `npm run db:verify`:
  - `saved_items`, `planning_drafts`: solo la dueña lee/escribe; `anon` sin acceso.
  - `profiles`: cada usuaria ve y edita su nombre/nivel/periodo; **no** su rol (privilegios por columna). Solo `admin` cambia roles vía `set_user_role`.
  - Currículo: lectura para usuarias autenticadas; escritura solo service role.
  - `happy_events`/`happy_feedback`: inserta la dueña; administración lee agregados. Sin contenido de conversaciones.
  - Administración **no** puede leer los espacios privados de las docentes.
- **Datos de niñas y niños**: la app no pide ni necesita datos personales de niñas/niños. Happy no diagnostica, no etiqueta ni califica numéricamente (prompt + validación + avisos). Se recomienda a las docentes no escribir nombres en sus mensajes; las planeaciones son privadas.
- **Contenido como datos**: la evidencia curricular y los mensajes se delimitan (`<evidencia>`, `<mensaje>`, `<borrador>`) y el prompt instruye ignorar instrucciones incrustadas. La salida del modelo se valida con Zod y nunca se renderiza como HTML.
- **Entradas**: acciones de servidor y rutas API validan con Zod (IDs de experiencia con regex, longitudes máximas). Límite de 20 solicitudes/min por usuaria en Happy (por instancia).
- **Cabeceras**: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `robots: noindex`.
- **Modo demo**: solo con `HAPPY_DEMO_MODE=true`; muestra un aviso permanente; no usar con datos reales. Sin Supabase ni demo, la app muestra `/configuracion` en lugar de funcionar sin autenticación.
- **Acceso**: cuentas creadas/invitadas por la institución; el enlace mágico no crea usuarios (`shouldCreateUser: false`).
