import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { dirname } from "node:path";
import { listDir, listDrives, isRoot, formatBytes, type Entry } from "../../core/files";
import { windowStart, wrapStep } from "../move";
import { COLOR, GUTTER, ICON } from "../theme";

const IS_WIN = process.platform === "win32";
// Sentinel dir: the Windows "pick a drive" screen (above every drive root).
export const DRIVES = "";

// A keyboard file picker so you never have to type a path. Shows folders and the
// media files you can actually convert (everything else is hidden). On Windows
// you can step above a drive root to switch disks (C:, D:, …). `dir` is owned by
// the parent so the location survives the format-menu round-trip.
export function FileBrowser({
  height,
  width,
  isActive,
  dir,
  onNavigate,
  onPick,
}: {
  height: number;
  width: number;
  isActive: boolean;
  dir: string;
  onNavigate: (dir: string) => void;
  onPick: (path: string) => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const [cursor, setCursor] = useState(0);
  const setDir = (next: string): void => {
    onNavigate(next);
    setCursor(0);
  };

  const onDrives = dir === DRIVES;
  const entries = useMemo(
    () => (onDrives ? listDrives() : listDir(dir, { showHidden, mediaOnly: true })),
    [dir, showHidden, onDrives],
  );

  const atRoot = !onDrives && isRoot(dir);
  // A leading row to go up: ".." inside a tree, "drives" when sitting at a drive
  // root on Windows, nothing at the very top.
  const showUp = !onDrives && (!atRoot || IS_WIN);
  const rows: (Entry | "up")[] = showUp ? ["up", ...entries] : entries;

  const clamped = Math.min(cursor, Math.max(0, rows.length - 1));
  const listH = Math.max(3, height - 1); // one line for the path crumb
  const start = windowStart(clamped, rows.length, listH);
  const visible = rows.slice(start, start + listH);

  const goUp = (): void => {
    if (onDrives) return;
    const parent = dirname(dir);
    if (parent === dir || isRoot(dir)) {
      // At a drive root: on Windows step out to the drive list, else stay put.
      if (IS_WIN) setDir(DRIVES);
      return;
    }
    setDir(parent);
  };

  const enter = (row: Entry | "up"): void => {
    if (row === "up") return goUp();
    if (row.isDir) setDir(row.path);
    else onPick(row.path);
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
        if (row) enter(row);
      } else if (input === "h" && !onDrives) {
        setShowHidden((v) => !v);
        setCursor(0);
      }
    },
    { isActive },
  );

  const crumb = onDrives ? "Select a drive" : truncateLeft(dir, Math.max(8, width - 4));
  const emptyMsg = onDrives
    ? "No drives found."
    : "No videos or audio here — only convertible files show. ← to go back.";

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={COLOR.alt} wrap="truncate-start">
          {crumb}
        </Text>
      </Box>
      {rows.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>{emptyMsg}</Text>
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
                <Text color={here ? COLOR.accent : undefined} dimColor={!here}>
                  {label}
                </Text>
              </Box>
            );
          }

          const icon = row.isDir ? ICON.folder : ICON.media;
          const tint = here ? COLOR.accent : row.isDir ? COLOR.alt : COLOR.text;
          return (
            <Box key={row.path}>
              {pointer}
              <Box flexShrink={0} marginRight={1}>
                <Text color={tint}>{icon}</Text>
              </Box>
              <Box flexGrow={1} minWidth={0}>
                <Text color={tint} bold={here} wrap="truncate-end">
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
