import { execFile } from "node:child_process";

// Read the system clipboard as text, or null if we can't (no clipboard tool,
// headless session, timeout). Dependency-free: shells out to what each OS ships.
const COMMANDS: [string, string[]][] =
  process.platform === "win32"
    ? [
        [
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Clipboard -Raw",
          ],
        ],
      ]
    : process.platform === "darwin"
      ? [["pbpaste", []]]
      : [
          ["wl-paste", ["--no-newline"]],
          ["xclip", ["-selection", "clipboard", "-o"]],
          ["xsel", ["--clipboard", "--output"]],
        ];

function tryRead(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 3000, windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      resolve(err ? null : stdout.toString());
    });
  });
}

export async function readClipboard(): Promise<string | null> {
  for (const [cmd, args] of COMMANDS) {
    const out = await tryRead(cmd, args);
    if (out !== null) return out.trim();
  }
  return null;
}
