import { useState } from "react";
import { homedir } from "node:os";
import { Panel } from "../components/Panel";
import { FileBrowser } from "../components/FileBrowser";
import { ConvertMenu } from "../components/ConvertMenu";
import { TrimInput } from "../components/TrimInput";
import { targetsFor, type ConvertTarget } from "../../convert/targets";
import { isMediaFile } from "../../core/files";
import { ICON } from "../theme";

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
}: {
  width: number;
  height: number;
  focused: boolean;
  picked: string | null;
  trimming: boolean;
  onPick: (path: string) => void;
  onChoose: (target: ConvertTarget) => void;
  onTrim: (from: number, to: number) => void;
}) {
  // Held here (not in FileBrowser) so the location survives the format-menu step.
  const [dir, setDir] = useState<string>(() => homedir());
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
        />
      )}
    </Panel>
  );
}
