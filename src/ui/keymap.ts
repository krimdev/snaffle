import type { Hint } from "./components/Footer";
import type { Section } from "./sections";

export type Region = "sidebar" | "content";
export type PdfStep = "menu" | "pickSingle" | "pickMulti" | "range";

const SWITCH: Hint = { keys: "tab", label: "Switch pane" };

export function footerHints(
  region: Region,
  section: Section,
  picking = false,
  pdfStep?: PdfStep,
  trimming = false,
): Hint[] {
  if (region === "sidebar") {
    return [
      { keys: "↑↓", label: "Move" },
      { keys: "↵", label: "Open" },
      SWITCH,
      { keys: "q", label: "Quit" },
    ];
  }
  // region === "content"
  if (section === "grab") {
    return [
      { keys: "←/→", label: "Video/Audio" },
      { keys: "↑↓", label: "Quality" },
      { keys: "↵", label: "Grab" },
      SWITCH,
      { keys: "esc", label: "Back" },
    ];
  }
  if (section === "convert") {
    if (trimming) {
      return [
        { keys: "type", label: "Start end e.g. 0:05 1:30" },
        { keys: "↵", label: "Trim" },
        { keys: "esc", label: "Back" },
      ];
    }
    if (picking) {
      return [
        { keys: "↑↓", label: "Format" },
        { keys: "↵", label: "Convert" },
        { keys: "esc", label: "Pick another" },
      ];
    }
    return [
      { keys: "↑↓", label: "Move" },
      { keys: "↵", label: "Open / pick" },
      { keys: "←", label: "Up" },
      { keys: "h", label: "Hidden" },
      SWITCH,
      { keys: "esc", label: "Back" },
    ];
  }
  if (section === "pdf") {
    if (pdfStep === "menu") {
      return [{ keys: "↑↓", label: "Move" }, { keys: "↵", label: "Choose" }, SWITCH, { keys: "esc", label: "Back" }];
    }
    if (pdfStep === "pickMulti") {
      return [
        { keys: "↑↓", label: "Move" },
        { keys: "space", label: "Select" },
        { keys: "↵", label: "Create" },
        { keys: "←", label: "Up" },
        { keys: "esc", label: "Back" },
      ];
    }
    if (pdfStep === "range") {
      return [{ keys: "type", label: "Pages e.g. 1-3,5" }, { keys: "↵", label: "Split" }, { keys: "esc", label: "Back" }];
    }
    // pickSingle
    return [
      { keys: "↑↓", label: "Move" },
      { keys: "↵", label: "Open / pick" },
      { keys: "←", label: "Up" },
      { keys: "esc", label: "Back" },
    ];
  }
  // queue
  return [
    { keys: "c", label: "Clear done" },
    SWITCH,
    { keys: "esc", label: "Back" },
  ];
}
