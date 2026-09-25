import { spawn } from "node:child_process";
import { dirname } from "node:path";

// Hand a path to the OS: open a file with its default app, or show it selected
// in the file manager. Fire-and-forget — failures are silent (nothing useful to
// do about a missing file manager from inside a TUI).
function launch(cmd: string, args: string[], verbatim = false): void {
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      windowsVerbatimArguments: verbatim,
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // ignore
  }
}

export function openFile(path: string): void {
  if (process.platform === "win32") launch("explorer.exe", [path]);
  else if (process.platform === "darwin") launch("open", [path]);
  else launch("xdg-open", [path]);
}

export function revealFile(path: string): void {
  if (process.platform === "win32") {
    // explorer wants `/select,"C:\path"` as one verbatim argument.
    launch("explorer.exe", [`/select,"${path}"`], true);
  } else if (process.platform === "darwin") {
    launch("open", ["-R", path]);
  } else {
    launch("xdg-open", [dirname(path)]);
  }
}
