import { spawn } from "node:child_process";

// Stop a process and everything it spawned. yt-dlp hands merging to ffmpeg, so a
// plain kill on Windows would leave that child running; taskkill /T takes the
// whole tree. Elsewhere SIGTERM on the pid is enough for our children.
export function killTree(pid: number): void {
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // already gone
  }
}
