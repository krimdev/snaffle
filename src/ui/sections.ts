import { GUTTER } from "./theme";

export type Section = "grab" | "convert" | "pdf" | "queue";

export interface NavItem {
  key: Section;
  label: string;
  badged?: boolean;
}

// Two groups: the things you start (grab a link, convert a file, PDF tools) and
// the place you watch them run (the queue, badged with its active count).
export const GROUPS: NavItem[][] = [
  [
    { key: "grab", label: "Grab" },
    { key: "convert", label: "Convert" },
    { key: "pdf", label: "PDF" },
  ],
  [{ key: "queue", label: "Queue", badged: true }],
];

export const NAV: NavItem[] = GROUPS.flat();

const BADGE_W = " (00)".length;

export const RAIL_WIDTH =
  GUTTER + Math.max(...NAV.map((n) => n.label.length + (n.badged ? BADGE_W : 0)));
