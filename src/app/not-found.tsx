import Link from 'next/link';
import { HappyAvatar } from '@/components/brand/Happy';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <HappyAvatar size={64} />
      <h1 className="text-2xl font-extrabold">No encontramos esta página</h1>
      <p className="text-ink-soft">Puede que el enlace haya cambiado.</p>
      <Link href="/" className="btn btn-primary">
        Ir al inicio
      </Link>
    </main>
  );
}
