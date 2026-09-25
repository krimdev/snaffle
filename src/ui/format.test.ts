import { describe, expect, it } from "vitest";
import { fmtClock, fmtElapsed } from "./format";
import { matchesFilter } from "./components/FileBrowser";

describe("formatting", () => {
  it("formats elapsed time compactly", () => {
    expect(fmtElapsed(8_000)).toBe("8s");
    expect(fmtElapsed(72_000)).toBe("1m 12s");
    expect(fmtElapsed(3_780_000)).toBe("1h 03m");
  });

  it("formats media durations as a clock", () => {
    expect(fmtClock(19)).toBe("0:19");
    expect(fmtClock(225.02)).toBe("3:45");
    expect(fmtClock(3723)).toBe("1:02:03");
  });
});

describe("matchesFilter", () => {
  it("matches every word, case-insensitively, anywhere in the name", () => {
    expect(matchesFilter("Holiday Video 2024.mp4", "video")).toBe(true);
    expect(matchesFilter("Holiday Video 2024.mp4", "hol 2024")).toBe(true);
    expect(matchesFilter("Holiday Video 2024.mp4", "hol 2023")).toBe(false);
    expect(matchesFilter("anything", "")).toBe(true);
  });
});
