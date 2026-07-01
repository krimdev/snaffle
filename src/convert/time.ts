// Parse a human timecode into seconds. Accepts SS, SS.ms, MM:SS or HH:MM:SS
// (with optional fractional seconds). Throws a message the UI can show verbatim.
export function parseTimecode(input: string): number {
  const s = input.trim();
  if (!/^\d+(\.\d+)?$|^\d+:\d{1,2}(\.\d+)?$|^\d+:\d{1,2}:\d{1,2}(\.\d+)?$/.test(s)) {
    throw new Error(`"${input}" isn't a time — use SS, MM:SS or HH:MM:SS`);
  }
  let sec = 0;
  for (const part of s.split(":")) sec = sec * 60 + Number(part);
  return sec;
}

// Parse a "start end" trim spec (space- or comma-separated) into seconds, and
// make sure the end is actually after the start.
export function parseTrim(input: string): { from: number; to: number } {
  const tokens = input.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length !== 2) {
    throw new Error("Enter a start and an end, e.g. 0:05 1:30");
  }
  const from = parseTimecode(tokens[0]!);
  const to = parseTimecode(tokens[1]!);
  if (to <= from) throw new Error("End must be after start.");
  return { from, to };
}
