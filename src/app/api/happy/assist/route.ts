import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fieldAssistRequestSchema } from '@/lib/happy/schema';
import { runFieldAssist } from '@/lib/happy/service';
import { allowRequest } from '@/lib/http/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });
  if (!allowRequest(`happy:${session.profile.id}`)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes seguidas. Espera un momento.' }, { status: 429 });
  }
  const parsed = fieldAssistRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  return NextResponse.json(await runFieldAssist(parsed.data, session));
}
