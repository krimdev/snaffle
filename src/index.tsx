import { render } from "ink";
import { App } from "./ui/App";
import { TaskQueue } from "./core/queue";
import { resetTerminalStatus } from "./ui/useTerminalStatus";
import { updateInBackground } from "./download/update";

// snaffle is a keyboard-driven TUI: it needs a real terminal on stdin (raw mode)
// to read keypresses. If stdin isn't a TTY (piped, CI, some wrappers), Ink would
// throw "Raw mode is not supported"; bail out with a friendly message instead.
if (!process.stdin.isTTY) {
  console.error("snaffle is an interactive terminal app — run it directly in a terminal (its input can't be piped).");
  process.exit(1);
}

// Leave the tab title and taskbar progress clean however we exit.
process.on("exit", resetTerminalStatus);

// Keep yt-dlp current without the user having to think about it.
updateInBackground();

const queue = new TaskQueue();
const { waitUntilExit } = render(<App queue={queue} />);
waitUntilExit().then(() => process.exit(0));
