// The "SNAFFLE" wordmark as block-letter art (each glyph 4 wide, 5 tall). The
// Logo component paints it with a white→orange gradient. Keeping the rows here,
// separate from rendering, makes the width easy to measure for layout.
export const LOGO_LINES: readonly string[] = [
  "████ █  █  ██  ████ ████ █    ████",
  "█    ██ █ █  █ █    █    █    █   ",
  "████ █ ██ ████ ███  ███  █    ███ ",
  "   █ █  █ █  █ █    █    █    █   ",
  "████ █  █ █  █ █    █    ████ ████",
];

export const LOGO_WIDTH = Math.max(...LOGO_LINES.map((l) => [...l].length));
