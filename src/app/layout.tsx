import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';

const figtree = Figtree({ subsets: ['latin', 'latin-ext'], variable: '--font-figtree', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Happy Time · Plataforma curricular', template: '%s · Happy Time' },
  description: 'Malla curricular de Happy Time y Happy, el asistente curricular para docentes.',
  applicationName: 'Happy Time',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#faf8f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={figtree.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
