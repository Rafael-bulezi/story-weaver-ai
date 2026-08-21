import { Diamond, GitBranch, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextUsage, PinnedContextItem } from "@/lib/story-store";

export interface LiveContextStripProps {
  chapterLabel: string;
  usage: ContextUsage;
  pinned: PinnedContextItem[];
  onTogglePinned: (id: string, type: "core" | "lore") => void;
  onOpenManager: () => void;
}

export function LiveContextStrip({
  chapterLabel,
  usage,
  pinned,
  onTogglePinned,
  onOpenManager,
}: LiveContextStripProps) {
  const hasPinned = pinned.length > 0;
  const hasUsage = usage.kind !== "none";

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-1.5 text-[11px] no-scrollbar border-b border-border/40 bg-card/20 shrink-0">
      {/* Quiet Default State: Chapter Scope */}
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground font-semibold tracking-wide">
        <GitBranch className="h-3 w-3" />
        {chapterLabel}
      </span>

      {/* Author-Pinned Canon (Persistent Intent) */}
      {hasPinned && (
        <>
          <span className="text-muted-foreground/50">·</span>
          {pinned.map((item) => (
            <ContextChip
              key={item.id}
              label={item.label}
              onRemove={() => onTogglePinned(item.id, item.type)}
            />
          ))}
        </>
      )}

      {/* Ephemeral Agent Usage or Author Constraint */}
      {hasUsage && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium border transition-colors",
              usage.kind === "author-constraint"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
            )}
          >
            <Diamond className="h-2.5 w-2.5" />
            <span className="truncate max-w-[200px] sm:max-w-md">
              {usage.kind === "author-constraint" ? "CONSTRAINT" : "USING CONTEXT"}
              {usage.label && ` · ${usage.label}`}
            </span>
          </div>
        </>
      )}

      {/* Add / Manage Context Trigger */}
      <button
        type="button"
        onClick={onOpenManager}
        aria-label="Manage context"
        title="Manage Context"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-auto"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ContextChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm transition">
      <span className="truncate max-w-[120px]">{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground/60 hover:text-foreground/80 pl-0.5 flex items-center"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
