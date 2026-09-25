import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { COLOR } from "../theme";

// A minimal single-line input — enough for pasting a URL or a file path and
// pressing Enter. We keep our own buffer rather than pull in a text input
// dependency, so the whole TUI stays self-contained. Pass `value`/`onChange` to
// control it from the parent (e.g. to react to what's being typed).
export function TextField({
  placeholder,
  onSubmit,
  isActive,
  value: controlled,
  onChange,
  prompt = "❯ ",
  promptColor = COLOR.fox,
}: {
  placeholder: string;
  // Return false to keep the text (e.g. it was rejected and the user will fix it).
  onSubmit: (value: string) => boolean | void;
  isActive: boolean;
  value?: string;
  onChange?: (value: string) => void;
  prompt?: string;
  promptColor?: string;
}) {
  const [own, setOwn] = useState("");
  const value = controlled ?? own;
  const set = (next: string): void => {
    if (controlled === undefined) setOwn(next);
    onChange?.(next);
  };

  useInput(
    (input, key) => {
      if (key.return) {
        const v = value.trim();
        if (v && onSubmit(v) !== false) set("");
      } else if (key.backspace || key.delete) {
        set(value.slice(0, -1));
      } else if (key.ctrl && input === "u") {
        set("");
      } else if (input && !key.ctrl && !key.meta && !key.tab && !key.escape) {
        // Paste arrives as a single chunk; strip stray newlines so a copied URL
        // with a trailing return doesn't smuggle a line break into the buffer.
        set(value + input.replace(/[\r\n]/g, ""));
      }
    },
    { isActive },
  );

  const empty = value.length === 0;
  // truncate-start keeps the end of a long URL (where the cursor is) in view.
  return (
    <Box flexGrow={1} minWidth={0}>
      <Box flexShrink={0}>
        <Text color={promptColor}>{prompt}</Text>
      </Box>
      <Box flexGrow={1} minWidth={0}>
        <Text wrap="truncate-start">
          <Text color={empty ? undefined : COLOR.text} dimColor={empty}>
            {empty ? placeholder : value}
          </Text>
          {isActive ? <Text color={COLOR.fox}>▏</Text> : null}
        </Text>
      </Box>
    </Box>
  );
}
