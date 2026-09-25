import { GUTTER, ICON } from "./theme";

export type Section = "grab" | "convert" | "pdf" | "queue";

export interface NavItem {
  key: Section;
  label: string;
  icon: string;
  badged?: boolean;
}

// Two groups: the things you start (grab a link, convert a file, PDF tools) and
// the place you watch them run (the queue, badged with its active count).
export const GROUPS: NavItem[][] = [
  [
    { key: "grab", label: "Grab", icon: ICON.grab },
    { key: "convert", label: "Convert", icon: ICON.convert },
    { key: "pdf", label: "PDF", icon: ICON.pdf },
  ],
  [{ key: "queue", label: "Queue", icon: ICON.queue, badged: true }],
];

export const NAV: NavItem[] = GROUPS.flat();

// Icon + space before each label; " ⠋ 00" after a badged one.
const ICON_W = 2;
const BADGE_W = " ⠋ 00".length;

export const RAIL_WIDTH =
  GUTTER + ICON_W + Math.max(...NAV.map((n) => n.label.length + (n.badged ? BADGE_W : 0)));
