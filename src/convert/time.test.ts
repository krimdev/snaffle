import { describe, expect, it } from "vitest";
import { parseTimecode, parseTrim } from "./time";

describe("parseTimecode", () => {
  it("parses seconds, MM:SS and HH:MM:SS", () => {
    expect(parseTimecode("30")).toBe(30);
    expect(parseTimecode("1:30")).toBe(90);
    expect(parseTimecode("1:05:30")).toBe(3930);
  });

  it("handles fractional seconds", () => {
    expect(parseTimecode("12.5")).toBe(12.5);
    expect(parseTimecode("0:01.5")).toBe(1.5);
  });

  it("rejects nonsense", () => {
    expect(() => parseTimecode("abc")).toThrow();
    expect(() => parseTimecode("1:2:3:4")).toThrow();
  });
});

describe("parseTrim", () => {
  it("parses a space- or comma-separated pair", () => {
    expect(parseTrim("0:05 1:30")).toEqual({ from: 5, to: 90 });
    expect(parseTrim("10, 40")).toEqual({ from: 10, to: 40 });
  });

  it("requires end after start", () => {
    expect(() => parseTrim("1:30 0:05")).toThrow(/after start/);
    expect(() => parseTrim("5 5")).toThrow(/after start/);
  });

  it("requires exactly two values", () => {
    expect(() => parseTrim("0:05")).toThrow();
    expect(() => parseTrim("1 2 3")).toThrow();
  });
});
