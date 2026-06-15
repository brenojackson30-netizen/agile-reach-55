import type { Platform } from "@/integrations/supabase/types";

const PLATFORM_META: Record<Platform, { label: string; abbr: string; bg: string; fg: string }> = {
  instagram: { label: "Instagram", abbr: "IG", bg: "#E1306C", fg: "#fff" },
  youtube: { label: "YouTube", abbr: "YT", bg: "#FF0000", fg: "#fff" },
  tiktok: { label: "TikTok", abbr: "TK", bg: "#00F2EA", fg: "#000" },
  facebook: { label: "Facebook", abbr: "FB", bg: "#1877F2", fg: "#fff" },
  threads: { label: "Threads", abbr: "TH", bg: "#CCCCCC", fg: "#000" },
  kwai: { label: "Kwai", abbr: "KW", bg: "#FFB800", fg: "#000" },
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  const m = PLATFORM_META[platform];
  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: m.bg, color: m.fg }}
      aria-label={m.label}
      title={m.label}
    >
      {m.abbr}
    </span>
  );
}

export function platformLabel(p: Platform) {
  return PLATFORM_META[p].label;
}
