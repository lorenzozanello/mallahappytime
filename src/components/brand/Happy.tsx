import Image from 'next/image';

/** Happy's avatar: the Happy Time clock symbol (supplied brand asset). */
export function HappyAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  const src = size > 96 ? '/brand/happy-192.png' : size > 48 ? '/brand/happy-96.png' : '/brand/happy-64.png';
  return <Image src={src} alt="" width={size} height={size} className={`shrink-0 rounded-full ${className}`} aria-hidden />;
}

/** "Happy" wordmark in solid purple (never multicolor). */
export function HappyName({ className = '' }: { className?: string }) {
  return <span className={`font-extrabold tracking-tight text-happy ${className}`}>Happy</span>;
}

export function HappyTimeLogo({ className = '' }: { className?: string }) {
  return <Image src="/brand/happy-time-logo.png" alt="Happy Time" width={120} height={120} className={className} priority />;
}
