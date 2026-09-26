import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';

const schema = z.object({
  eventId: z.string().uuid(),
  rating: z.enum(['useful', 'not_useful']),
  nextAction: z.enum(['saved', 'developed', 'planned', 'none']).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  await session.repo.recordFeedback(session.profile.id, parsed.data.eventId, parsed.data.rating, parsed.data.nextAction ?? null);
  return NextResponse.json({ ok: true });
}
