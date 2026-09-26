import { setUserRole } from '@/app/actions/auth';
import { requireRole } from '@/lib/auth/session';
import { resolveEmbeddingModel, resolveHappyModel } from '@/lib/ai/provider';
import { backendMode, config } from '@/lib/config';
import { corpus } from '@/lib/curriculum';
import { PROMPT_VERSION } from '@/lib/happy/prompt';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ROLE_LABELS, ROLES } from '@/lib/workspace/types';

export const metadata = { title: 'Administración' };

async function databaseCurriculumStatus() {
  if (backendMode() !== 'supabase') return null;
  try {
    const db = await createSupabaseServerClient();
    const [version, chunks, embedded] = await Promise.all([
      db.from('curriculum_versions').select('id, source_sha256, imported_at').eq('status', 'active').maybeSingle(),
      db.from('curriculum_chunks').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('curriculum_chunks').select('id', { count: 'exact', head: true }).eq('status', 'active').not('embedding', 'is', null),
    ]);
    return {
      versionId: version.data?.id ?? null,
      sha: version.data?.source_sha256 ?? null,
      importedAt: version.data?.imported_at ?? null,
      chunks: chunks.count ?? 0,
      embedded: embedded.count ?? 0,
      error: version.error?.message ?? chunks.error?.message ?? null,
    };
  } catch (err) {
    return { versionId: null, sha: null, importedAt: null, chunks: 0, embedded: 0, error: err instanceof Error ? err.message : 'error' };
  }
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 border-t border-line py-2 first:border-t-0 text-sm">
      <dt className="font-semibold text-ink-soft">{k}</dt>
      <dd className="min-w-0 break-words">{v}</dd>
    </div>
  );
}

export default async function AdminPage() {
  const { repo } = await requireRole(['admin']);
  const [profiles, stats, db] = await Promise.all([repo.listProfiles(), repo.happyStats(), databaseCurriculumStatus()]);
  const model = resolveHappyModel();
  const embedding = resolveEmbeddingModel();
  const v = corpus.version;
  const inSync = db ? db.versionId === v.id && db.sha === v.sourceSha256 && db.chunks === corpus.chunks.length : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Administración</h1>

      <section className="card p-5" aria-labelledby="curriculo">
        <h2 id="curriculo" className="mb-3 text-lg font-bold">
          Currículo
        </h2>
        <dl>
          <Row k="Versión" v={`${v.label} (${v.id})`} />
          <Row k="Archivo fuente" v={v.sourceFile} />
          <Row k="SHA-256" v={<code className="text-xs">{v.sourceSha256}</code>} />
          <Row k="Contenido" v={`${corpus.levels.length} niveles · ${corpus.experiences.length} experiencias · ${corpus.developmentSummaries.length} resúmenes de progresión · ${corpus.principles.length} principios · ${corpus.chunks.length} fragmentos`} />
          <Row
            k="Base de datos"
            v={
              db === null
                ? 'Modo demostración: el corpus se sirve desde el archivo generado.'
                : db.error
                  ? `Error al consultar: ${db.error}`
                  : `${db.versionId ?? 'sin versión activa'} · ${db.chunks} fragmentos · ${db.embedded} con embeddings · ${inSync ? 'sincronizada ✓' : 'NO sincronizada: aplica supabase/seed.sql'}`
            }
          />
        </dl>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Notas de importación ({corpus.issues.length})</summary>
          <ul className="mt-2 space-y-2 text-sm text-ink-soft">
            {corpus.issues.map((i) => (
              <li key={i.location + i.description}>
                <strong>{i.kind === 'ambiguity' ? 'Ambigüedad' : 'Normalización'}</strong> · {i.location}: {i.description}
              </li>
            ))}
          </ul>
        </details>
        <p className="mt-3 text-sm text-ink-muted">
          Para actualizar la malla: reemplaza el Excel en <code>curriculum/source/</code>, ejecuta <code>npm run curriculum:import</code>, revisa las pruebas de paridad y
          despliega. La plataforma no permite editar el currículo desde la interfaz.
        </p>
      </section>

      <section className="card p-5" aria-labelledby="happy-config">
        <h2 id="happy-config" className="mb-3 text-lg font-bold">
          Happy · configuración
        </h2>
        <dl>
          <Row k="Modelo (HAPPY_MODEL)" v={`${model.id} · ${model.status === 'ready' ? `activo vía ${model.route}` : `no disponible: ${model.reason}`}`} />
          <Row k="Embeddings" v={embedding ? `${config.embeddingModel} (búsqueda semántica activa si Supabase tiene embeddings)` : 'No configurados: búsqueda léxica + conceptos'} />
          <Row k="Versión de prompt" v={PROMPT_VERSION} />
          <Row k="Costo estimado" v={config.costPerMTok ? `USD ${config.costPerMTok.input}/${config.costPerMTok.output} por millón de tokens (entrada/salida)` : 'Sin precios configurados (solo se registran tokens)'} />
        </dl>
      </section>

      <section className="card p-5" aria-labelledby="happy-uso">
        <h2 id="happy-uso" className="mb-3 text-lg font-bold">
          Happy · uso y calidad
        </h2>
        <p className="mb-3 text-sm text-ink-muted">Solo metadatos: no se almacenan los mensajes de las docentes ni las respuestas.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Interacciones', stats.total],
            ['Últimos 7 días', stats.last7Days],
            ['Latencia media', stats.avgLatencyMs === null ? '—' : `${(stats.avgLatencyMs / 1000).toFixed(1)} s`],
            ['Útil / No útil', `${stats.feedback.useful} / ${stats.feedback.notUseful}`],
          ].map(([k, val]) => (
            <div key={k} className="rounded-xl bg-canvas p-3">
              <p className="text-xs font-semibold text-ink-muted">{k}</p>
              <p className="text-xl font-extrabold">{val}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <strong>Por modo:</strong> {Object.entries(stats.byMode).map(([k, n]) => `${k} ${n}`).join(' · ') || '—'}
        </p>
        <p className="text-sm">
          <strong>Validación:</strong> {Object.entries(stats.byValidation).map(([k, n]) => `${k} ${n}`).join(' · ') || '—'}
        </p>
        {stats.recent.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr>
                  <th className="py-1 pr-2">Fecha</th>
                  <th className="pr-2">Modo</th>
                  <th className="pr-2">Modelo</th>
                  <th className="pr-2">Fuentes</th>
                  <th className="pr-2">Validación</th>
                  <th>Latencia</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="py-1 pr-2">{new Date(e.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="pr-2">{e.mode}</td>
                    <td className="pr-2">{e.model}</td>
                    <td className="pr-2">{e.sourceIds.length}</td>
                    <td className="pr-2">{e.validationStatus}</td>
                    <td>{e.latencyMs ?? '—'} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="usuarios" className="card scroll-mt-24 p-5" aria-labelledby="usuarios-h">
        <h2 id="usuarios-h" className="mb-3 text-lg font-bold">
          Usuarios y roles
        </h2>
        <p className="mb-3 text-sm text-ink-muted">Las cuentas se crean o invitan desde Supabase Auth. Aquí se asigna el rol.</p>
        <ul className="divide-y divide-line">
          {profiles.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 font-semibold">{p.displayName || p.id}</span>
              <form action={setUserRole} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={p.id} />
                <select name="role" defaultValue={p.role} className="field w-auto" aria-label={`Rol de ${p.displayName}`}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-secondary">
                  Guardar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
