import { useEffect, useMemo, useState } from "react";
import { Box, useApp, useInput, useStdin } from "ink";
import { Header, headerHeight } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { Splash } from "./components/Splash";
import { Grab } from "./views/Grab";
import { Convert } from "./views/Convert";
import { Pdf } from "./views/Pdf";
import { Queue } from "./views/Queue";
import { footerHints, type Region, type PdfStep } from "./keymap";
import { NAV, RAIL_WIDTH, type Section } from "./sections";
import { LOGO_WIDTH } from "./logo";
import { wrapStep } from "./move";
import { isUrl } from "../core/detect";
import { runTrim } from "../convert/ffmpeg";
import { outputDir } from "../util/paths";
import { basename } from "node:path";
import type { ConvertTarget } from "../convert/targets";
import type { TaskQueue } from "../core/queue";
import type { Task } from "../core/types";

const SPLASH_MS = 1600;

export function App({ queue }: { queue: TaskQueue }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [size, setSize] = useState({
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });
  useEffect(() => {
    const onResize = (): void =>
      setSize({ cols: process.stdout.columns || 80, rows: process.stdout.rows || 24 });
    process.stdout.on("resize", onResize);
    return () => void process.stdout.off("resize", onResize);
  }, []);
  const { cols, rows } = size;

  const [splash, setSplash] = useState(true);
  const [section, setSection] = useState<Section>("grab");
  const [region, setRegion] = useState<Region>("content");
  const [tasks, setTasks] = useState<Task[]>(() => queue.list());
  const [notice, setNotice] = useState<string | null>(null);
  // The file chosen in Convert, awaiting a format choice. App owns it so Esc can
  // route correctly (cancel the menu vs. leave the pane).
  const [picked, setPicked] = useState<string | null>(null);
  // When the chosen convert format is "trim", we show a from/to prompt instead of
  // queueing straight away. App owns it so Esc routes correctly.
  const [trimming, setTrimming] = useState(false);
  // The PDF view reports its current step here purely so the footer hints match
  // (the PDF view owns its own Esc/back navigation).
  const [pdfStep, setPdfStep] = useState<PdfStep>("menu");

  // Mirror the queue into React state (the queue mutates tasks in place, so copy
  // the array to force a re-render).
  useEffect(() => {
    const onUpdate = (): void => setTasks([...queue.list()]);
    queue.on("update", onUpdate);
    return () => void queue.off("update", onUpdate);
  }, [queue]);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const onGrab = (value: string, audioOnly: boolean, maxHeight?: number): void => {
    if (!isUrl(value)) {
      setNotice("That doesn't look like a link. Use Convert for local files.");
      return;
    }
    queue.add("download", value, { audioOnly, maxHeight });
    setNotice(audioOnly ? "Grabbing audio → MP3…" : `Grabbing video${maxHeight ? ` (${maxHeight}p)` : ""}…`);
    setSection("queue");
    setRegion("content");
  };

  // Step 1: a file was picked — show the format menu (don't queue yet).
  const onPick = (path: string): void => setPicked(path);

  // Step 2: a format was chosen. "trim" opens a from/to prompt; anything else
  // queues straight away and jumps to the queue.
  const onChoose = (target: ConvertTarget): void => {
    if (!picked) return;
    if (target.id === "trim") {
      setTrimming(true);
      return;
    }
    queue.add("convert", picked, { target: target.id });
    setNotice(`Converting ${basename(picked)} → ${target.ext.toUpperCase()}`);
    setPicked(null);
    setSection("queue");
    setRegion("content");
  };

  // Step 3 (trim only): times entered — queue the cut and jump to the queue.
  const onTrim = (from: number, to: number): void => {
    if (!picked) return;
    const file = picked;
    queue.addJob(`Trim ${basename(file)}`, "convert", (onP) =>
      runTrim(file, from, to, outputDir(), { onProgress: onP }),
    );
    setNotice(`Trimming ${basename(file)}…`);
    setPicked(null);
    setTrimming(false);
    setSection("queue");
    setRegion("content");
  };

  const onPdfJob = (title: string, run: () => Promise<string>): void => {
    queue.addJob(title, "pdf", run);
    setNotice(title);
    setSection("queue");
    setRegion("content");
  };

  const idx = Math.max(0, NAV.findIndex((n) => n.key === section));

  useInput(
    (input, key) => {
      if (splash) {
        setSplash(false);
        return;
      }
      if (key.tab) {
        setRegion((r) => (r === "sidebar" ? "content" : "sidebar"));
        return;
      }
      if (region === "sidebar") {
        if (key.upArrow) setSection(NAV[wrapStep(idx, -1, NAV.length)]!.key);
        else if (key.downArrow) setSection(NAV[wrapStep(idx, 1, NAV.length)]!.key);
        else if (key.return || key.rightArrow) setRegion("content");
        else if (input === "q") exit();
        return;
      }
      // region === "content": views own their own keys; here we only handle
      // leaving the pane and the queue's clear shortcut.
      // The PDF view runs its own multi-step Esc/back navigation, so don't touch
      // its keys here.
      if (section === "pdf") return;
      if (key.escape) {
        // Convert steps back out one at a time: trim → format menu → file list.
        if (trimming) {
          setTrimming(false);
          return;
        }
        if (picked) {
          setPicked(null);
          return;
        }
        setRegion("sidebar");
        return;
      }
      if (section === "queue" && input === "c") {
        if (queue.clearDone()) setNotice("Cleared finished tasks.");
      }
    },
    { isActive: isRawModeSupported === true },
  );

  // --- layout ---------------------------------------------------------------
  // Show the full block wordmark only when there's room for it; otherwise the
  // header collapses to a one-line name.
  const bigHeader = rows >= 20 && cols >= LOGO_WIDTH + 4;
  const showFooter = rows >= 10;
  const headerH = headerHeight(bigHeader);
  const bodyH = Math.max(6, rows - headerH - 1 - (showFooter ? 1 : 0));
  const panelH = Math.max(5, bodyH - 1);
  const contentWidth = Math.max(24, cols - RAIL_WIDTH - 3);
  const ruleWidth = Math.max(10, cols - 2);

  const downloadTasks = useMemo(() => tasks.filter((t) => t.kind === "download"), [tasks]);
  const contentFocused = region === "content";

  if (splash) return <Splash rows={rows} cols={cols} />;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header width={ruleWidth} big={bigHeader} notice={notice} />

      <Box height={bodyH} marginTop={1} overflow="hidden">
        <Sidebar section={section} focused={region === "sidebar"} activeCount={queue.activeCount} />
        <Box flexGrow={1} flexDirection="column">
          {section === "grab" ? (
            <Grab
              width={contentWidth}
              height={panelH}
              focused={contentFocused}
              onSubmit={onGrab}
              tasks={downloadTasks}
            />
          ) : section === "convert" ? (
            <Convert
              width={contentWidth}
              height={panelH}
              focused={contentFocused}
              picked={picked}
              trimming={trimming}
              onPick={onPick}
              onChoose={onChoose}
              onTrim={onTrim}
            />
          ) : section === "pdf" ? (
            <Pdf
              width={contentWidth}
              height={panelH}
              focused={contentFocused}
              onRunJob={onPdfJob}
              onExit={() => setRegion("sidebar")}
              onStep={setPdfStep}
            />
          ) : (
            <Queue width={contentWidth} height={panelH} focused={contentFocused} tasks={tasks} />
          )}
        </Box>
      </Box>

      {showFooter ? (
        <Box>
          <Footer hints={footerHints(region, section, !!picked, pdfStep, trimming)} />
        </Box>
      ) : null}
    </Box>
  );
}
