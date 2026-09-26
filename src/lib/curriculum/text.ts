import type { SplitMode } from './sections';

/**
 * Split a curriculum cell into scannable list items WITHOUT rewriting content.
 * Every returned item is a verbatim substring of the input (only surrounding
 * whitespace and a trailing period are removed).
 */
export function splitItems(text: string, mode: SplitMode): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (mode === 'none') return [stripFinalPeriod(trimmed)];
  let parts = trimmed.split(';');
  if (parts.length === 1 && mode === 'semicolon_or_comma') {
    parts = trimmed.split(',');
  }
  return parts.map((p) => stripFinalPeriod(p.trim())).filter(Boolean);
}

function stripFinalPeriod(s: string): string {
  return s.endsWith('.') ? s.slice(0, -1).trimEnd() : s;
}

/** Split running prose into sentences (verbatim substrings). */
export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Display helper: capitalise the first letter of a verbatim fragment. */
export function capitalize(s: string): string {
  return s.length ? s.charAt(0).toLocaleUpperCase('es') + s.slice(1) : s;
}

/**
 * Normalise text for matching: lowercase, strip accents and punctuation.
 * Used by search and by provenance checks; never for display.
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
