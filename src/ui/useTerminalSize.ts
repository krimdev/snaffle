import { useEffect, useState } from "react";

export interface TermSize {
  cols: number;
  rows: number;
}

// Ink doesn't re-render on terminal resize on its own, so we track the size and
// feed it through the layout. Falls back to a sane 80x24 when stdout has no TTY.
export function useTerminalSize(): TermSize {
  const read = (): TermSize => ({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });
  const [size, setSize] = useState<TermSize>(read);

  useEffect(() => {
    const onResize = (): void => setSize(read());
    process.stdout.on("resize", onResize);
    return () => void process.stdout.off("resize", onResize);
  }, []);

  return size;
}
