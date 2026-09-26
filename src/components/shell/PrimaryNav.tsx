'use client';

import { Bookmark, BookOpen, House } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_NAV, isActive } from './nav-items';

function Icon({ name, active }: { name: (typeof PRIMARY_NAV)[number]['icon']; active: boolean }) {
  const cls = 'h-6 w-6';
  const stroke = active ? 2.4 : 1.9;
  if (name === 'home') return <House className={cls} strokeWidth={stroke} aria-hidden />;
  if (name === 'malla') return <BookOpen className={cls} strokeWidth={stroke} aria-hidden />;
  if (name === 'saved') return <Bookmark className={cls} strokeWidth={stroke} aria-hidden />;
  return (
    <Image
      src="/brand/happy-64.png"
      alt=""
      width={26}
      height={26}
      aria-hidden
      className={`rounded-full ${active ? 'ring-2 ring-happy ring-offset-1' : 'opacity-90'}`}
    />
  );
}

/** Mobile: fixed bottom bar. Desktop: inline tabs in the header. Same 4 destinations. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[0.78rem] font-semibold ${
                  active ? (item.icon === 'happy' ? 'text-happy' : 'text-brand') : 'text-ink-muted'
                }`}
              >
                <Icon name={item.icon} active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-[0.95rem] font-semibold ${
                  active ? (item.icon === 'happy' ? 'bg-happy-soft text-happy' : 'bg-brand-soft text-brand') : 'text-ink-soft hover:bg-[#f1ede7]'
                }`}
              >
                <Icon name={item.icon} active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
