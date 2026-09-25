import type { Hint } from "./components/Footer";
import type { Section } from "./sections";
import type { TaskStatus } from "../core/types";

export type Region = "sidebar" | "content";
export type PdfStep = "menu" | "pickSingle" | "pickMulti" | "range";

const SWITCH: Hint = { keys: "tab", label: "Switch pane" };
const HELP: Hint = { keys: "?", label: "Help" };
const BACK: Hint = { keys: "esc", label: "Back" };
const FILTER: Hint = { keys: "/", label: "Filter" };

// What the footer shows while a browser's type-to-filter is open.
const FILTERING: Hint[] = [
  { keys: "type", label: "Filter" },
  { keys: "↑↓", label: "Move" },
  { keys: "↵", label: "Open / pick" },
  { keys: "esc", label: "Clear filter" },
];

export interface HintContext {
  picking?: boolean;
  pdfStep?: PdfStep;
  trimming?: boolean;
  filtering?: boolean;
  // Status of the task selected in the queue, if any.
  queueSel?: TaskStatus | null;
}

export function footerHints(region: Region, section: Section, ctx: HintContext = {}): Hint[] {
  const { picking = false, pdfStep, trimming = false, filtering = false, queueSel } = ctx;
  if (region === "sidebar") {
    return [
      { keys: "↑↓", label: "Move" },
      { keys: "↵", label: "Open" },
      SWITCH,
      HELP,
      { keys: "q", label: "Quit" },
    ];
  }
  // region === "content"
  if (filtering && (section === "convert" || section === "pdf")) return FILTERING;
  if (section === "grab") {
    return [
      { keys: "↵", label: "Grab" },
      { keys: "←/→", label: "Video/Audio" },
      { keys: "↑↓", label: "Quality" },
      { keys: "ctrl+u", label: "Clear" },
      SWITCH,
      BACK,
    ];
  }
  if (section === "convert") {
    if (trimming) {
      return [
        { keys: "type", label: "Start end e.g. 0:05 1:30" },
        { keys: "↵", label: "Trim" },
        BACK,
      ];
    }
    if (picking) {
      return [
        { keys: "↑↓", label: "Format" },
        { keys: "↵", label: "Convert" },
        { keys: "esc", label: "Pick another" },
        HELP,
      ];
    }
    return [
      { keys: "↑↓", label: "Move" },
      { keys: "↵", label: "Open / pick" },
      { keys: "←", label: "Up" },
      FILTER,
      { keys: "h", label: "Hidden" },
      SWITCH,
      HELP,
    ];
  }
  if (section === "pdf") {
    if (pdfStep === "menu") {
      return [{ keys: "↑↓", label: "Move" }, { keys: "↵", label: "Choose" }, SWITCH, HELP, BACK];
    }
    if (pdfStep === "pickMulti") {
      return [
        { keys: "↑↓", label: "Move" },
        { keys: "space", label: "Select" },
        { keys: "↵", label: "Create" },
        { keys: "←", label: "Up" },
        FILTER,
        BACK,
      ];
    }
    if (pdfStep === "range") {
      return [{ keys: "type", label: "Pages e.g. 1-3,5" }, { keys: "↵", label: "Split" }, BACK];
    }
    // pickSingle
    return [{ keys: "↑↓", label: "Move" }, { keys: "↵", label: "Open / pick" }, { keys: "←", label: "Up" }, FILTER, BACK];
  }
  // queue: offer only what applies to the selected task.
  const hints: Hint[] = [];
  if (queueSel) hints.push({ keys: "↑↓", label: "Move" });
  if (queueSel === "done") hints.push({ keys: "o", label: "Open" }, { keys: "f", label: "Show in folder" });
  if (queueSel === "error" || queueSel === "cancelled") hints.push({ keys: "r", label: "Retry" });
  if (queueSel === "running" || queueSel === "queued") hints.push({ keys: "x", label: "Cancel" });
  else if (queueSel) hints.push({ keys: "x", label: "Remove" });
  hints.push({ keys: "c", label: "Clear done" }, HELP, BACK);
  return hints;
}

// The full key reference for the ? overlay, grouped by where you are.
export const HELP_SECTIONS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Everywhere",
    keys: [
      ["tab", "Menu ⇄ panel"],
      ["esc", "Go back a step"],
      ["?", "This help"],
      ["q", "Quit (from the menu)"],
    ],
  },
  {
    title: "Grab",
    keys: [
      ["↵", "Grab (or the clipboard link)"],
      ["←/→", "Video (MP4) or audio (MP3)"],
      ["↑↓", "Quality / bitrate"],
      ["ctrl+u", "Clear the field"],
      ["drop", "Drop a video to convert it"],
    ],
  },
  {
    title: "Convert & PDF browser",
    keys: [
      ["/", "Filter the list by typing"],
      ["← / →", "Up a folder / open"],
      ["h", "Show hidden files"],
      ["space", "Select (PDF multi-pick)"],
    ],
  },
  {
    title: "Queue",
    keys: [
      ["o  ↵", "Open the file"],
      ["f", "Show in folder"],
      ["r", "Retry"],
      ["x", "Cancel / remove"],
      ["c", "Clear finished tasks"],
    ],
  },
];
