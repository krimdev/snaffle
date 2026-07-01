import { mediaKind } from "../core/files";

// A conversion preset: the output extension and the ffmpeg arguments that get
// you there. `args` returns the full argument list (input + flags + output) so
// the runner just spawns ffmpeg with it.
export interface ConvertTarget {
  id: string;
  label: string;
  ext: string;
  // Appended before the extension to keep distinct outputs from colliding in the
  // output folder (e.g. "clip (compressed).mp4" vs "clip.mp4").
  suffix?: string;
  args: (input: string, output: string) => string[];
}

const ALL: Record<string, ConvertTarget> = {
  mp4: {
    id: "mp4",
    label: "Video · MP4",
    ext: "mp4",
    suffix: "converted",
    args: (i, o) => ["-y", "-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", o],
  },
  compress: {
    id: "compress",
    label: "Compress · smaller MP4",
    ext: "mp4",
    suffix: "compressed",
    args: (i, o) => ["-y", "-i", i, "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-c:a", "aac", "-b:a", "128k", o],
  },
  mp3: {
    id: "mp3",
    label: "Audio · MP3",
    ext: "mp3",
    args: (i, o) => ["-y", "-i", i, "-vn", "-q:a", "2", o],
  },
  m4a: {
    id: "m4a",
    label: "Audio · M4A",
    ext: "m4a",
    args: (i, o) => ["-y", "-i", i, "-vn", "-c:a", "aac", "-b:a", "192k", o],
  },
  wav: {
    id: "wav",
    label: "Audio · WAV",
    ext: "wav",
    args: (i, o) => ["-y", "-i", i, "-vn", o],
  },
  // Trim is handled specially (it needs start/end times and keeps the original
  // container), so its args are never used — it only appears as a menu entry.
  trim: {
    id: "trim",
    label: "Trim · cut a section",
    ext: "",
    args: () => [],
  },
};

const VIDEO_TARGETS = ["mp4", "compress", "mp3", "m4a", "trim"];
const AUDIO_TARGETS = ["mp3", "m4a", "wav", "trim"];

// The targets that make sense for a given input file.
export function targetsFor(name: string): ConvertTarget[] {
  const kind = mediaKind(name);
  const ids = kind === "audio" ? AUDIO_TARGETS : VIDEO_TARGETS;
  return ids.map((id) => ALL[id]!);
}

export function targetById(id: string | undefined): ConvertTarget | undefined {
  return id ? ALL[id] : undefined;
}

// Fallback when a task somehow has no/unknown target (keeps the old behaviour).
export const DEFAULT_TARGET = ALL.mp3!;
