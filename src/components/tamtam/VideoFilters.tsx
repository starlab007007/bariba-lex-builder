import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export type VideoFilter = {
  id: string;
  name: string;
  name_ba?: string;
  cssFilter: string; // applied to video/img
  icon?: string;
};

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: "none", name: "Original", name_ba: "Bìrì", cssFilter: "none", icon: "⬤" },
  { id: "soft", name: "Soft", cssFilter: "contrast(1.05) saturate(1.08) brightness(1.04)", icon: "✨" },
  { id: "warm", name: "Warm", cssFilter: "contrast(1.05) saturate(1.1) sepia(0.18)", icon: "🌅" },
  { id: "cool", name: "Cool", cssFilter: "contrast(1.04) saturate(1.08) hue-rotate(10deg)", icon: "🧊" },
  { id: "b&w", name: "B&W", cssFilter: "grayscale(1) contrast(1.1)", icon: "◐" },
  { id: "cinema", name: "Cinema", cssFilter: "contrast(1.12) saturate(1.05) brightness(0.98)", icon: "🎬" },
  { id: "vivid", name: "Vivid", cssFilter: "contrast(1.15) saturate(1.25)", icon: "💥" },
  { id: "mono", name: "Mono", cssFilter: "grayscale(0.5) contrast(1.05)", icon: "⚪" },
  { id: "dream", name: "Dream", cssFilter: "contrast(1.03) saturate(1.12) brightness(1.06)", icon: "☁️" },
  { id: "noir", name: "Noir", cssFilter: "grayscale(1) brightness(0.95) contrast(1.2)", icon: "🖤" },
];

export default function VideoFiltersPanel(props: {
  isOpen: boolean;
  onClose: () => void;
  selectedFilterId?: string;
  onSelectFilter: (f: VideoFilter) => void;
  language?: "fr" | "ba";
  className?: string;
}) {
  const { isOpen, selectedFilterId = "none", onSelectFilter, language = "fr", className } = props;

  const filters = useMemo(() => VIDEO_FILTERS, []);
  if (!isOpen) return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-2 gap-2">
        {filters.map((f) => {
          const active = f.id === selectedFilterId;
          const label = language === "ba" && f.name_ba ? f.name_ba : f.name;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFilter(f)}
              className={cn(
                "h-11 px-3 rounded-2xl border text-left text-white flex items-center justify-between",
                active ? "bg-white/15 border-white/25" : "bg-white/10 border-white/10 hover:bg-white/12"
              )}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <span className="text-base">{f.icon ?? "⬤"}</span>
                {label}
              </span>
              {active ? <span className="text-xs text-white/70">✓</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
