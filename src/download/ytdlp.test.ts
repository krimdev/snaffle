import { describe, expect, it } from "vitest";
import { friendlyError, parseMeta, parsePath, parseProgress } from "./ytdlp";

describe("yt-dlp output parsing", () => {
  it("reads our tagged meta line", () => {
    expect(parseMeta("SNAFFLE_META\tMe at the zoo\tjawed\t19\tjNQXAC9IVRw")).toEqual({
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      uploader: "jawed",
      duration: "0:19",
    });
  });

  it("keeps longer durations as yt-dlp formats them", () => {
    expect(parseMeta("SNAFFLE_META\tT\tU\t3:45")?.duration).toBe("3:45");
    expect(parseMeta("SNAFFLE_META\tT\tU\t5")?.duration).toBe("0:05");
  });

  it("drops NA fields and rejects a missing title", () => {
    expect(parseMeta("SNAFFLE_META\tClip\tNA\tNA\tNA")).toEqual({
      id: undefined,
      title: "Clip",
      uploader: undefined,
      duration: undefined,
    });
    expect(parseMeta("SNAFFLE_META\tNA\tx\t1")).toBeNull();
    expect(parseMeta("[download] 10%")).toBeNull();
  });

  it("reads the final path, spaces included", () => {
    expect(parsePath("SNAFFLE_PATH\tC:\\Users\\me\\Downloads\\snaffle\\Me_at_the_zoo [jNQ].mp4")).toBe(
      "C:\\Users\\me\\Downloads\\snaffle\\Me_at_the_zoo [jNQ].mp4",
    );
    expect(parsePath("something else")).toBeNull();
  });

  it("pulls percentage, speed and ETA out of a progress line", () => {
    const p = parseProgress("[download]  28.8% of  218.53KiB at    4.39MiB/s ETA 00:12");
    expect(p?.fraction).toBeCloseTo(0.288);
    expect(p?.detail).toBe("4.39MiB/s · ETA 00:12");
  });

  it("turns yt-dlp's ERROR line into something readable", () => {
    const stderr = "WARNING: meh\nERROR: [youtube] abc123: Video unavailable. This video is private\n";
    expect(friendlyError(stderr)).toBe("Video unavailable. This video is private");
    expect(friendlyError("ERROR: Unsupported URL: https://example.com")).toBe("Unsupported URL: https://example.com");
    expect(friendlyError("no errors here")).toBeNull();
  });
});
