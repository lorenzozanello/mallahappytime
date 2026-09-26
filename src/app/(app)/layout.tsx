import { AppHeader, DemoBanner } from '@/components/shell/AppHeader';
import { BottomNav } from '@/components/shell/PrimaryNav';
import { requireSession } from '@/lib/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, mode } = await requireSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-2">
        Saltar al contenido
      </a>
      {mode === 'demo' && <DemoBanner />}
      <AppHeader profile={profile} />
      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
