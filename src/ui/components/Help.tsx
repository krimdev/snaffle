import { Box, Text } from "ink";
import { Panel } from "./Panel";
import { HELP_SECTIONS } from "../keymap";
import { COLOR } from "../theme";

type HelpSection = (typeof HELP_SECTIONS)[number];

const KEY_W = Math.max(...HELP_SECTIONS.flatMap((s) => s.keys.map(([k]) => k.length))) + 3;

function Group({ section, first }: { section: HelpSection; first: boolean }) {
  return (
    <Box flexDirection="column" marginTop={first ? 0 : 1}>
      <Text color={COLOR.accent} bold>
        {section.title}
      </Text>
      {section.keys.map(([k, what]) => (
        <Box key={k + what}>
          <Box width={KEY_W} flexShrink={0} marginLeft={2}>
            <Text color={COLOR.alt}>{k}</Text>
          </Box>
          <Box flexGrow={1} minWidth={0}>
            <Text dimColor wrap="truncate-end">
              {what}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// The ? overlay: every key in one place, in two columns when there's room.
// Takes over the content panel; any key closes it.
export function Help({ width, height }: { width: number; height: number }) {
  // One column when it fits (title + keys per group, a gap between groups, the
  // closing line); otherwise split into two side by side.
  const oneColH =
    HELP_SECTIONS.reduce((h, s) => h + 1 + s.keys.length, 0) + (HELP_SECTIONS.length - 1) + 2;
  const twoCols = width >= 64 && oneColH > height - 2;
  const half = Math.ceil(HELP_SECTIONS.length / 2);
  const columns = twoCols ? [HELP_SECTIONS.slice(0, half), HELP_SECTIONS.slice(half)] : [HELP_SECTIONS];
  const colW = twoCols ? Math.floor((width - 4) / 2) : width - 4;
  return (
    <Panel title="keys" width={width} height={height} focused>
      <Box>
        {columns.map((col, ci) => (
          <Box key={ci} flexDirection="column" width={colW} marginRight={ci === 0 && twoCols ? 1 : 0}>
            {col.map((s, i) => (
              <Group key={s.title} section={s} first={i === 0} />
            ))}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to close.</Text>
      </Box>
    </Panel>
  );
}
