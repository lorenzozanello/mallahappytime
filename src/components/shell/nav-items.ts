export const PRIMARY_NAV = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/malla', label: 'Malla', icon: 'malla' },
  { href: '/happy', label: 'Happy', icon: 'happy' },
  { href: '/guardados', label: 'Guardados', icon: 'saved' },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
