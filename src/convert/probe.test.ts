import { describe, expect, it } from "vitest";
import { parseMediaInfo } from "./ffmpeg";

const BANNER = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'clip.mp4':
  Duration: 00:03:45.02, start: 0.000000, bitrate: 200 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 92 kb/s, 30 fps
  Stream #0:1[0x2](eng): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s (default)
At least one output file must be specified`;

describe("parseMediaInfo", () => {
  it("reads duration, resolution and codecs from the ffmpeg banner", () => {
    expect(parseMediaInfo(BANNER)).toEqual({
      durationSec: 225.02,
      width: 1920,
      height: 1080,
      videoCodec: "h264",
      audioCodec: "aac",
    });
  });

  it("handles audio-only input", () => {
    const info = parseMediaInfo("  Duration: 00:00:19.00, start: 0\n  Stream #0:0: Audio: mp3, 44100 Hz, stereo, fltp, 190 kb/s");
    expect(info).toEqual({ durationSec: 19, audioCodec: "mp3" });
  });
});
