import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { basename } from "node:path";
import { homedir } from "node:os";
import { Panel } from "../components/Panel";
import { FileBrowser } from "../components/FileBrowser";
import { TextField } from "../components/TextField";
import { isImageFile, isPdfFile } from "../../core/files";
import { imagesToPdf, mergePdfs, splitPdf, pdfPageCount } from "../../pdf/ops";
import { parsePageRange } from "../../pdf/range";
import { wrapStep } from "../move";
import { COLOR, GUTTER, ICON } from "../theme";
import type { PdfStep } from "../keymap";

type Action = "images" | "merge" | "split";
type Step = "menu" | "pick" | "range";

const ACTIONS: { id: Action; label: string; hint: string }[] = [
  { id: "images", label: "Images → PDF", hint: "Combine JPG/PNG into one PDF" },
  { id: "merge", label: "Merge PDFs", hint: "Join several PDFs into one file" },
  { id: "split", label: "Split / extract pages", hint: "Pull chosen pages out of a PDF" },
];

export function Pdf({
  width,
  height,
  focused,
  onRunJob,
  onExit,
  onStep,
}: {
  width: number;
  height: number;
  focused: boolean;
  onRunJob: (title: string, run: () => Promise<string>) => void;
  onExit: () => void;
  onStep: (step: PdfStep) => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [action, setAction] = useState<Action>("images");
  const [cursor, setCursor] = useState(0);
  const [dir, setDir] = useState<string>(() => homedir());
  const [selected, setSelected] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const multi = action !== "split";

  // Report the precise step so App can show the right footer hints.
  useEffect(() => {
    onStep(step === "menu" ? "menu" : step === "range" ? "range" : multi ? "pickMulti" : "pickSingle");
  }, [step, multi, onStep]);

  const reset = (): void => {
    setSelected([]);
    setPicked(null);
    setPageCount(null);
    setError(null);
  };

  // Esc walks back a step; from the menu it leaves the pane entirely.
  useInput(
    (_input, key) => {
      if (!key.escape) return;
      if (step === "menu") onExit();
      else if (step === "range") {
        setStep("pick");
        setPicked(null);
        setPageCount(null);
        setError(null);
      } else {
        setStep("menu");
        reset();
      }
    },
    { isActive: focused },
  );

  // Step 1 — choose an action.
  useInput(
    (_input, key) => {
      if (key.upArrow) setCursor((c) => wrapStep(c, -1, ACTIONS.length));
      else if (key.downArrow) setCursor((c) => wrapStep(c, 1, ACTIONS.length));
      else if (key.return || key.rightArrow) {
        setAction(ACTIONS[cursor]!.id);
        reset();
        setStep("pick");
      }
    },
    { isActive: focused && step === "menu" },
  );

  const toggle = (path: string): void => {
    setError(null);
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  };

  const confirmMulti = (): void => {
    if (action === "images") {
      if (selected.length < 1) return setError("Pick at least one image — press space to select.");
      onRunJob(`${selected.length} image${selected.length === 1 ? "" : "s"} → PDF`, () => imagesToPdf(selected));
    } else {
      if (selected.length < 2) return setError("Pick at least two PDFs — press space to select.");
      onRunJob(`Merge ${selected.length} PDFs`, () => mergePdfs(selected));
    }
  };

  // Split: picking a single PDF moves to the page-range step.
  const pickSingle = (path: string): void => {
    setPicked(path);
    setPageCount(null);
    setError(null);
    setStep("range");
    pdfPageCount(path)
      .then(setPageCount)
      .catch(() => {
        setError("Couldn't read that PDF.");
        setStep("pick");
      });
  };

  const submitRange = (value: string): void => {
    if (!picked || pageCount === null) return;
    try {
      const indices = parsePageRange(value, pageCount);
      onRunJob(`Split ${basename(picked)} (${value.trim()})`, () => splitPdf(picked, indices));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const inner = Math.max(10, width - 4);
  const title = `pdf${step === "menu" ? "" : ` · ${ACTIONS.find((a) => a.id === action)!.label}`}`;

  return (
    <Panel title={title} width={width} height={height} focused={focused}>
      {step === "menu" ? (
        <Box flexDirection="column">
          <Text dimColor>What do you want to do?</Text>
          <Box marginTop={1} flexDirection="column">
            {ACTIONS.map((a, i) => {
              const here = i === cursor && focused;
              return (
                <Box key={a.id}>
                  <Box width={GUTTER} flexShrink={0}>
                    <Text color={COLOR.accent}>{here ? ICON.pointer : ""}</Text>
                  </Box>
                  <Box width={22} flexShrink={0}>
                    <Text color={here ? COLOR.accent : COLOR.text} bold={here}>
                      {a.label}
                    </Text>
                  </Box>
                  <Text dimColor>{a.hint}</Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : step === "range" ? (
        <Box flexDirection="column">
          <Box>
            <Text dimColor>Split </Text>
            <Text color={COLOR.text} wrap="truncate-start">
              {picked ? basename(picked) : ""}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              {pageCount === null ? "Reading pages…" : `${pageCount} pages. Which to keep? e.g. 1-3,5`}
            </Text>
          </Box>
          <Box marginTop={1}>
            <TextField placeholder="1-3,5" onSubmit={submitRange} isActive={focused && pageCount !== null} />
          </Box>
          {error ? (
            <Box marginTop={1}>
              <Text color={COLOR.bad}>{error}</Text>
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box flexDirection="column">
          <FileBrowser
            width={inner}
            height={Math.max(3, height - 2)}
            isActive={focused}
            dir={dir}
            onNavigate={setDir}
            accept={action === "images" ? isImageFile : isPdfFile}
            emptyHint={
              action === "images"
                ? "No JPG/PNG here. ← to go back."
                : "No PDFs here. ← to go back."
            }
            multi={multi}
            selected={selected}
            onToggle={toggle}
            onConfirm={confirmMulti}
            onPick={pickSingle}
          />
          <Box marginTop={0}>
            {error ? (
              <Text color={COLOR.bad} wrap="truncate-end">
                {error}
              </Text>
            ) : (
              <Text dimColor wrap="truncate-end">
                {multi
                  ? `${selected.length} selected · space toggle · ↵ create`
                  : "↵ pick a PDF to split"}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Panel>
  );
}
