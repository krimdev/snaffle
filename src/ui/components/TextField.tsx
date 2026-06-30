import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { COLOR } from "../theme";

// A minimal controlled single-line input — enough for pasting a URL or a file
// path and pressing Enter. We keep our own buffer rather than pull in a text
// input dependency, so the whole TUI stays self-contained.
export function TextField({
  placeholder,
  onSubmit,
  isActive,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
  isActive: boolean;
}) {
  const [value, setValue] = useState("");

  useInput(
    (input, key) => {
      if (key.return) {
        const v = value.trim();
        if (v) onSubmit(v);
        setValue("");
      } else if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        // Paste arrives as a single chunk; strip stray newlines so a copied URL
        // with a trailing return doesn't smuggle a line break into the buffer.
        setValue((v) => v + input.replace(/[\r\n]/g, ""));
      }
    },
    { isActive },
  );

  const shown = value.length > 0 ? value : placeholder;
  return (
    <Box>
      <Text color={COLOR.fox}>{"❯ "}</Text>
      <Text color={value.length > 0 ? COLOR.text : undefined} dimColor={value.length === 0}>
        {shown}
      </Text>
      {isActive ? <Text color={COLOR.fox}>▏</Text> : null}
    </Box>
  );
}
