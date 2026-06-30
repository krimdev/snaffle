// Wrap a cursor by `delta` within [0, length), so up past the top lands at the
// bottom and vice-versa.
export function wrapStep(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}

// First visible index for a windowed list that keeps the cursor centered until
// it hits either end.
export function windowStart(cursor: number, total: number, height: number): number {
  if (total <= height) return 0;
  const half = Math.floor(height / 2);
  return Math.max(0, Math.min(cursor - half, total - height));
}
