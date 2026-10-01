import { describe, expect, it } from "vitest";
import { parseUpdateOutput } from "./update";

describe("parseUpdateOutput", () => {
  it("recognizes an installed update and its version", () => {
    const out = [
      "Current version: stable@2026.06.09 from yt-dlp/yt-dlp",
      "Latest version: stable@2026.08.19 from yt-dlp/yt-dlp",
      "Updating to stable@2026.08.19 from yt-dlp/yt-dlp ...",
      "Updated yt-dlp to stable@2026.08.19 from yt-dlp/yt-dlp",
    ].join("\n");
    expect(parseUpdateOutput(out)).toEqual({ updated: true, version: "2026.08.19" });
  });

  it("recognizes an already current binary", () => {
    const out = "Latest version: stable@2026.08.19 from yt-dlp/yt-dlp\nyt-dlp is up to date (stable@2026.08.19 from yt-dlp/yt-dlp)";
    expect(parseUpdateOutput(out)).toEqual({ updated: false, version: "2026.08.19" });
  });

  it("treats anything else as not updated", () => {
    expect(parseUpdateOutput("ERROR: Unable to write to yt-dlp.exe; try running as administrator")).toEqual({
      updated: false,
    });
    expect(parseUpdateOutput("")).toEqual({ updated: false });
  });
});
