// A small, fox-flavored palette. Orange leads (the mascot), green means done,
// red means trouble, the muted tones carry quiet supporting text and borders.
export const COLOR = {
  fox: "#ff8c2b",
  accent: "#ffae54",
  bright: "#ffd39b",
  text: "#efe7dd",
  alt: "#caa884",
  // "Success" / notices stay in the warm family — a brighter golden orange so
  // they read as positive without breaking the all-orange theme.
  good: "#ffc24b",
  warn: "#f0c560",
  bad: "#ff6b6b",
} as const;

// Border / rule grey and the standard left-gutter width, mirrored across panels
// and the sidebar so everything lines up on the same column.
export const RULE = "#6b6257";
export const GUTTER = 2;

export const ICON = {
  done: "✓",
  fail: "✗",
  pending: "·",
  pointer: "❯",
  dot: "·",
  bar: "▌",
  folder: "▸",
  file: "•",
  media: "♪",
  up: "↑",
} as const;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Linear blend between two hex colors, used for the fox's warm gradient sheen.
export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}
