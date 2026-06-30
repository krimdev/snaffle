import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { dirname } from "node:path";
import { listDir, listDrives, isRoot, formatBytes, type Entry } from "../../core/files";
import { windowStart, wrapStep } from "../move";
import { COLOR, GUTTER, ICON } from "../theme";

const IS_WIN = process.platform === "win32";
// Sentinel dir: the Windows "pick a drive" screen (above every drive root).
export const DRIVES = "";

// A keyboard file picker so you never have to type a path. Shows folders plus the
// files matching `accept` (everything else hidden). On Windows you can step above
// a drive root to switch disks. `dir` is owned by the parent so the location
// survives round-trips (format menu, etc.).
//
// Two modes:
//  • single  — Enter on a file calls onPick (Convert).
//  • multi   — Space toggles a file into `selected` (numbered in order); Enter on
//              a file confirms the whole selection via onConfirm (PDF tools).
export function FileBrowser({
  height,
  width,
  isActive,
  dir,
  onNavigate,
  accept,
  fileIcon = ICON.file,
  emptyHint = "Nothing here. ← to go back.",
  onPick,
  multi = false,
  selected = [],
  onToggle,
  onConfirm,
}: {
  height: number;
  width: number;
  isActive: boolean;
  dir: string;
  onNavigate: (dir: string) => void;
  accept?: (name: string) => boolean;
  fileIcon?: string;
  emptyHint?: string;
  onPick?: (path: string) => void;
  multi?: boolean;
  selected?: string[];
  onToggle?: (path: string) => void;
  onConfirm?: () => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const [cursor, setCursor] = useState(0);
  const setDir = (next: string): void => {
    onNavigate(next);
    setCursor(0);
  };

  const onDrives = dir === DRIVES;
  const entries = useMemo(
    () => (onDrives ? listDrives() : listDir(dir, { showHidden, accept })),
    [dir, showHidden, onDrives, accept],
  );

  const atRoot = !onDrives && isRoot(dir);
  const showUp = !onDrives && (!atRoot || IS_WIN);
  const rows: (Entry | "up")[] = showUp ? ["up", ...entries] : entries;

  const clamped = Math.min(cursor, Math.max(0, rows.length - 1));
  const listH = Math.max(2, height - 1); // one line for the path crumb
  const start = windowStart(clamped, rows.length, listH);
  const visible = rows.slice(start, start + listH);

  const goUp = (): void => {
    if (onDrives) return;
    const parent = dirname(dir);
    if (parent === dir || isRoot(dir)) {
      if (IS_WIN) setDir(DRIVES); // step out to the drive list
      return;
    }
    setDir(parent);
  };

  const onRow = (row: Entry | "up"): void => {
    if (row === "up") return goUp();
    if (row.isDir) return setDir(row.path);
    // It's a file: single mode picks it; multi mode confirms the selection.
    if (multi) onConfirm?.();
    else onPick?.(row.path);
  };

  useInput(
    (input, key) => {
      if (rows.length === 0) {
        if (key.leftArrow || key.backspace || key.delete) goUp();
        return;
      }
      if (key.upArrow) setCursor(wrapStep(clamped, -1, rows.length));
      else if (key.downArrow) setCursor(wrapStep(clamped, 1, rows.length));
      else if (key.leftArrow || key.backspace || key.delete) goUp();
      else if (key.return || key.rightArrow) {
        const row = rows[clamped];
        if (row) onRow(row);
      } else if (input === " " && multi) {
        const row = rows[clamped];
        if (row && row !== "up" && !row.isDir) onToggle?.(row.path);
      } else if (input === "h" && !onDrives) {
        setShowHidden((v) => !v);
        setCursor(0);
      }
    },
    { isActive },
  );

  const crumb = onDrives ? "Select a drive" : truncateLeft(dir, Math.max(8, width - 4));

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={COLOR.alt} wrap="truncate-start">
          {crumb}
        </Text>
      </Box>
      {rows.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>{onDrives ? "No drives found." : emptyHint}</Text>
        </Box>
      ) : (
        visible.map((row, i) => {
          const index = start + i;
          const here = index === clamped && isActive;
          const pointer = (
            <Box width={GUTTER} flexShrink={0}>
              <Text color={COLOR.accent}>{here ? ICON.pointer : ""}</Text>
            </Box>
          );

          if (row === "up") {
            const label = atRoot && IS_WIN ? `${ICON.up} drives` : `${ICON.up} ..`;
            return (
              <Box key="up">
                {pointer}
                {multi ? <Box width={3} flexShrink={0} /> : null}
                <Text color={here ? COLOR.accent : undefined} dimColor={!here}>
                  {label}
                </Text>
              </Box>
            );
          }

          const pick = multi && !row.isDir ? selected.indexOf(row.path) : -1;
          const chosen = pick >= 0;
          const icon = row.isDir ? ICON.folder : fileIcon;
          const tint = here ? COLOR.accent : chosen ? COLOR.fox : row.isDir ? COLOR.alt : COLOR.text;
          return (
            <Box key={row.path}>
              {pointer}
              {multi ? (
                <Box width={3} flexShrink={0}>
                  <Text color={COLOR.fox} bold>
                    {chosen ? `${pick + 1}.` : ""}
                  </Text>
                </Box>
              ) : null}
              <Box flexShrink={0} marginRight={1}>
                <Text color={tint}>{icon}</Text>
              </Box>
              <Box flexGrow={1} minWidth={0}>
                <Text color={tint} bold={here || chosen} wrap="truncate-end">
                  {row.name}
                  {row.isDir ? "/" : ""}
                </Text>
              </Box>
              {!row.isDir && row.sizeBytes > 0 ? (
                <Box flexShrink={0} marginLeft={1}>
                  <Text dimColor>{formatBytes(row.sizeBytes)}</Text>
                </Box>
              ) : null}
            </Box>
          );
        })
      )}
    </Box>
  );
}

// Keep the tail of a long path (the disambiguating part) visible.
function truncateLeft(s: string, max: number): string {
  if (s.length <= max) return s;
  return "…" + s.slice(s.length - max + 1);
}
