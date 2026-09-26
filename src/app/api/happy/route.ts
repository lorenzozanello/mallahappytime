import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { happyRequestSchema } from '@/lib/happy/schema';
import { runHappyTurn } from '@/lib/happy/service';
import { allowRequest } from '@/lib/http/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });
  if (!allowRequest(`happy:${session.profile.id}`)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Espera un momento.' }, { status: 429 });
  }
  const parsed = happyRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud no válida.' }, { status: 400 });
  }
  const turn = await runHappyTurn(parsed.data, session);
  return NextResponse.json(turn);
}
