import { useState } from "react";
import { Panel } from "../components/Panel";
import { FileBrowser } from "../components/FileBrowser";
import { ConvertMenu } from "../components/ConvertMenu";
import { TrimInput } from "../components/TrimInput";
import { targetsFor, type ConvertTarget } from "../../convert/targets";
import { isMediaFile } from "../../core/files";
import { ICON } from "../theme";
import { saveState, startDir } from "../../util/state";

// The "pick a file" screen. Steps: browse to a file → choose a format → (for
// Trim) enter start/end. `picked` and `trimming` are owned by App so Esc routes
// correctly across the steps.
export function Convert({
  width,
  height,
  focused,
  picked,
  trimming,
  onPick,
  onChoose,
  onTrim,
  onFilterChange,
}: {
  width: number;
  height: number;
  focused: boolean;
  picked: string | null;
  trimming: boolean;
  onPick: (path: string) => void;
  onChoose: (target: ConvertTarget) => void;
  onTrim: (from: number, to: number) => void;
  onFilterChange?: (active: boolean) => void;
}) {
  // Held here (not in FileBrowser) so the location survives the format-menu step.
  // Opens where you last browsed (remembered across runs).
  const [dir, setDirState] = useState<string>(startDir);
  const setDir = (next: string): void => {
    setDirState(next);
    if (next) saveState({ lastDir: next });
  };
  const inner = Math.max(10, width - 4);
  return (
    <Panel title="convert" width={width} height={height} focused={focused}>
      {picked && trimming ? (
        <TrimInput file={picked} isActive={focused} onSubmit={onTrim} />
      ) : picked ? (
        <ConvertMenu
          file={picked}
          targets={targetsFor(picked)}
          isActive={focused}
          width={inner}
          onChoose={onChoose}
        />
      ) : (
        <FileBrowser
          width={inner}
          height={Math.max(3, height - 1)}
          isActive={focused}
          dir={dir}
          onNavigate={setDir}
          accept={isMediaFile}
          fileIcon={ICON.media}
          emptyHint="No videos or audio here — only convertible files show. ← to go back."
          onPick={onPick}
          onFilterChange={onFilterChange}
        />
      )}
    </Panel>
  );
}
