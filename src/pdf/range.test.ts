import { describe, expect, it } from "vitest";
import { parsePageRange } from "./range";

describe("parsePageRange", () => {
  it("parses single pages and ranges into 0-based indices", () => {
    expect(parsePageRange("1-3,5", 10)).toEqual([0, 1, 2, 4]);
  });

  it("dedupes and sorts overlapping inputs", () => {
    expect(parsePageRange("5,1-3,2", 10)).toEqual([0, 1, 2, 4]);
  });

  it("normalizes a reversed range", () => {
    expect(parsePageRange("3-1", 10)).toEqual([0, 1, 2]);
  });

  it("tolerates spaces", () => {
    expect(parsePageRange(" 1 - 2 , 4 ", 10)).toEqual([0, 1, 3]);
  });

  it("rejects out-of-bounds pages", () => {
    expect(() => parsePageRange("1-12", 10)).toThrow(/between 1 and 10/);
    expect(() => parsePageRange("0", 10)).toThrow(/between 1 and 10/);
  });

  it("rejects garbage and empty input", () => {
    expect(() => parsePageRange("abc", 10)).toThrow();
    expect(() => parsePageRange("", 10)).toThrow();
  });
});
