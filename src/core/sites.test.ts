import { describe, expect, it } from "vitest";
import { shortUrl, siteName } from "./sites";

describe("siteName", () => {
  it("names the common sources", () => {
    expect(siteName("https://www.youtube.com/watch?v=x")).toBe("YouTube");
    expect(siteName("https://youtu.be/x")).toBe("YouTube");
    expect(siteName("https://m.facebook.com/watch/?v=1")).toBe("Facebook");
    expect(siteName("https://fb.watch/abc")).toBe("Facebook");
    expect(siteName("https://x.com/a/status/1")).toBe("X");
    expect(siteName("https://vm.tiktok.com/abc")).toBe("TikTok");
  });

  it("falls back to the bare host, and rejects non-links", () => {
    expect(siteName("https://www.example.org/v/1")).toBe("example.org");
    expect(siteName("not a link")).toBeNull();
    expect(siteName("ftp://files.example.com")).toBeNull();
  });
});

describe("shortUrl", () => {
  it("drops the scheme and www, and truncates", () => {
    expect(shortUrl("https://www.youtube.com/watch?v=abc")).toBe("youtube.com/watch?v=abc");
    expect(shortUrl("https://example.com/" + "a".repeat(100), 20)).toHaveLength(20);
  });
});
