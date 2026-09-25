// Friendly names for the hosts people paste most, so the Grab field can confirm
// "YouTube ✓" as you type. Anything else falls back to its bare hostname.
const SITES: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(facebook\.com|fb\.watch)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(x\.com|twitter\.com)$/, "X"],
  [/(^|\.)vimeo\.com$/, "Vimeo"],
  [/(^|\.)twitch\.tv$/, "Twitch"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)soundcloud\.com$/, "SoundCloud"],
  [/(^|\.)dailymotion\.com$/, "Dailymotion"],
  [/(^|\.)bilibili\.com$/, "Bilibili"],
  [/(^|\.)pinterest\.[a-z.]+$/, "Pinterest"],
];

export function siteName(url: string): string | null {
  let host: string;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [re, name] of SITES) if (re.test(host)) return name;
  return host.replace(/^www\./, "");
}

// A compact, human form of a URL for one-line hints: host + start of the path.
export function shortUrl(url: string, max = 48): string {
  let s = url.trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (s.length > max) s = s.slice(0, max - 1) + "…";
  return s;
}
