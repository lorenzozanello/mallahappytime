/** Renders a verbatim excerpt with highlighted ranges (no HTML injection). */
export function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) parts.push(text.slice(cursor, s));
    parts.push(<mark key={i}>{text.slice(s, e)}</mark>);
    cursor = e;
  });
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
