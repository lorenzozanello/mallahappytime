import { HappyWorkspace, type HappyModeInfo } from '@/components/happy/HappyWorkspace';
import { requireSession } from '@/lib/auth/session';
import { getExperience, getLevel, isLevelId, isPeriod } from '@/lib/curriculum';
import { ENABLED_MODES, type EnabledModeKey } from '@/lib/happy/modes';

export const metadata = { title: 'Happy' };

const STARTERS: Record<EnabledModeKey, string[]> = {
  explorar: [
    'Quiero trabajar animales pero ya hicimos sonidos y clasificación.',
    '¿Qué puedo trabajar relacionado con cooperación?',
    'Solo tengo 20 minutos, ¿qué puedo proponer hoy?',
  ],
  aterrizar: [
    'Quiero hacer algo con agua mañana.',
    'Tengo la idea de un rincón de cuentos con títeres. Ayúdame a desarrollarla.',
    'Quiero una experiencia al aire libre para esta semana.',
  ],
  conectar: [
    '¿Qué dice nuestra malla sobre esto?',
    '¿Qué puedo observar en esta experiencia?',
    '¿Qué experiencias anteriores preparan este aprendizaje?',
  ],
};

export default async function HappyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireSession();
  const sp = await searchParams;
  const levelId = sp.nivel && isLevelId(sp.nivel) ? sp.nivel : (profile.activeLevelId ?? undefined);
  const periodNum = Number(sp.periodo ?? profile.activePeriod);
  const period = isPeriod(periodNum) ? periodNum : undefined;
  const experience = levelId && period ? getExperience(levelId, period) : undefined;
  const level = levelId ? getLevel(levelId) : undefined;
  const modes: HappyModeInfo[] = ENABLED_MODES.map((m) => ({
    key: m.key as EnabledModeKey,
    label: m.label,
    tagline: m.tagline,
    placeholder: m.placeholder,
    starters: STARTERS[m.key as EnabledModeKey],
  }));
  const initialMode = (['explorar', 'aterrizar', 'conectar'] as const).find((m) => m === sp.modo) ?? 'explorar';

  return (
    <HappyWorkspace
      modes={modes}
      initialMode={initialMode}
      initialMessage={sp.pregunta?.slice(0, 500)}
      context={{
        levelId: level?.id,
        period: experience?.period,
        experienceId: experience?.id,
        label: level ? (experience ? `${level.name} · ${experience.periodLabel}` : level.name) : null,
        experienceTitle: experience?.title ?? null,
      }}
    />
  );
}
