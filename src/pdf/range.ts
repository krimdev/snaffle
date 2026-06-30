// Parse a human page spec like "1-3,5,8-10" into a sorted, deduped list of
// zero-based page indices, validated against the document's page count. Throws a
// message the UI can show verbatim when the input is malformed or out of bounds.
export function parsePageRange(input: string, pageCount: number): number[] {
  const tokens = input.split(",").map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new Error("Enter pages to keep, e.g. 1-3,5");
  }

  const pages = new Set<number>();
  for (const tok of tokens) {
    const m = tok.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error(`"${tok}" isn't a page or range`);
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > pageCount) {
      throw new Error(`Pages must be between 1 and ${pageCount}`);
    }
    for (let p = a; p <= b; p++) pages.add(p);
  }

  return [...pages].sort((x, y) => x - y).map((p) => p - 1);
}
