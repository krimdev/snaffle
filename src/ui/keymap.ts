import type { Hint } from "./components/Footer";
import type { Section } from "./sections";

export type Region = "sidebar" | "content";

const SWITCH: Hint = { keys: "tab", label: "Switch pane" };

export function footerHints(region: Region, section: Section, picking = false): Hint[] {
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
      { keys: "↵", label: "Grab" },
      SWITCH,
      { keys: "esc", label: "Back" },
    ];
  }
  if (section === "convert") {
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
  // queue
  return [
    { keys: "↑↓", label: "Scroll" },
    { keys: "c", label: "Clear done" },
    SWITCH,
    { keys: "esc", label: "Back" },
  ];
}
