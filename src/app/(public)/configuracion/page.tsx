import { redirect } from 'next/navigation';
import { HappyTimeLogo } from '@/components/brand/Happy';
import { backendMode } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configuración pendiente' };

/** Shown when neither Supabase nor demo mode is configured: explicit, never a silent fallback. */
export default function ConfiguracionPage() {
  if (backendMode() !== 'unconfigured') redirect('/ingresar');
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 px-4 py-10">
      <HappyTimeLogo className="h-24 w-24 object-contain" />
      <h1 className="text-2xl font-extrabold">Falta configurar la plataforma</h1>
      <p className="text-ink-soft">
        Para usar la plataforma se necesita conectar Supabase (autenticación y guardados). Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, o activa el modo demostración con <code>HAPPY_DEMO_MODE=true</code> solo para pruebas.
      </p>
      <p className="text-sm text-ink-muted">Consulta docs/DEPLOYMENT.md en el repositorio.</p>
    </main>
  );
}
