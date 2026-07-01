import { useState } from "react";
import { Box, Text } from "ink";
import { basename } from "node:path";
import { TextField } from "./TextField";
import { parseTrim } from "../../convert/time";
import { COLOR } from "../theme";

// Ask for a start and an end time, then hand back the parsed seconds. Keeps the
// original file untouched; the cut is written as a new "(trim)" file.
export function TrimInput({
  file,
  isActive,
  onSubmit,
}: {
  file: string;
  isActive: boolean;
  onSubmit: (from: number, to: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const submit = (value: string): void => {
    try {
      const { from, to } = parseTrim(value);
      onSubmit(from, to);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>Trim </Text>
        <Text color={COLOR.text} wrap="truncate-start">
          {basename(file)}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Type a start and an end time — e.g. 0:05 1:30 (or 5 90).</Text>
      </Box>
      <Box marginTop={1}>
        <TextField placeholder="0:05 1:30" onSubmit={submit} isActive={isActive} />
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color={COLOR.bad}>{error}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
