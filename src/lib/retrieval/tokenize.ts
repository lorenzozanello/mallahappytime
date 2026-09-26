import { normalizeForMatch } from '@/lib/curriculum/text';

const STOPWORDS = new Set(
  (
    'a al algo algun alguna algunas alguno algunos ante antes aqui asi aun como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estan estas este esto estos fue ha hay hasta la las le les lo los mas me mi mis mucho muy nada ni no nos nuestra nuestras nuestro nuestros o otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre su sus tambien tan te tener tengo tiene toda todas todo todos tu tus un una unas uno unos ya y yo ' +
    // teacher conversational filler
    'quiero puedo podemos podria necesito hacer hago trabajar trabajo relacionado relacionada dice dicen malla buscando busco cosas cosa ideas idea mi mis manana hoy tema temas ayudame ayuda favor esto eso realmente'
  ).split(/\s+/),
);

/** Very light Spanish stemmer: enough to fold plurals and common derivational endings. */
export function stem(token: string): string {
  let t = token;
  if (t.length <= 3) return t;
  for (const suf of ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'iciones', 'acion', 'icion', 'mente', 'idades', 'idad', 'ivas', 'ivos', 'iva', 'ivo']) {
    if (t.length - suf.length >= 4 && t.endsWith(suf)) {
      t = t.slice(0, -suf.length);
      break;
    }
  }
  if (t.length > 4 && t.endsWith('es')) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1);
  if (t.length > 4 && /[aeo]$/.test(t)) t = t.slice(0, -1);
  return t;
}

export function tokenize(text: string, { keepStopwords = false } = {}): string[] {
  return normalizeForMatch(text)
    .split(' ')
    .filter((t) => t.length > 1 && (keepStopwords || !STOPWORDS.has(t)));
}

export function stems(text: string): string[] {
  return tokenize(text).map(stem);
}
