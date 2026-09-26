import { NextResponse } from 'next/server';
import { corpus } from '@/lib/curriculum';
import { backendMode } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Liveness + non-sensitive configuration summary (no secrets, no user data). */
export function GET() {
  return NextResponse.json({
    ok: true,
    backend: backendMode(),
    curriculumVersion: corpus.version.id,
    chunks: corpus.chunks.length,
  });
}
