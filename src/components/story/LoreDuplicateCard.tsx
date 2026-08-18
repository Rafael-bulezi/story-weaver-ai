import { X, BookMarked, RefreshCw, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BooksApi, LorePendingUpdate, LoreItem } from "@/lib/story-store";

const TYPE_ICONS: Record<string, string> = {
  character: "👤",
  place: "📍",
  concept: "💡",
  faction: "⚔️",
};


/**
 * LoreDuplicateCard — shown inline when the AI-extracted candidate
 * is similar to an existing lore entry. Gives the user a choice:
 *   • Update existing — merges the new description into the existing entry
 *   • Keep separate — creates a new independent entry
 *   • Dismiss — discard the candidate
 */
export function LoreDuplicateCard({
  books,
  pending,
}: {
  books: BooksApi;
  pending: LorePendingUpdate;
}) {
  const active = books.active;
  if (!active) return null;
  const existing = active.lore.find((l) => l.id === pending.existingId);
  if (!existing) return null;

  const simPct = Math.round(pending.similarity * 100);
  const typeIcon = TYPE_ICONS[pending.candidate.type] ?? "◇";

  const nameExists = active.lore.some(
    (l) => l.name.trim().toLowerCase() === pending.candidate.name.trim().toLowerCase()
  );

  return (
    <div className="animate-slide-up-fade rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12.5px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
          <BookMarked className="h-3.5 w-3.5" />
          Similar lore entry found ({simPct}% match)
        </span>
        <button
          onClick={() => books.dismissLorePending(pending.id)}
          className="text-muted-foreground hover:text-foreground"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-background p-2">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Existing</p>
          <p className="font-semibold">
            {typeIcon} {existing.name}
          </p>
          <p className="mt-0.5 text-muted-foreground leading-relaxed">{existing.description}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">New</p>
          <p className="font-semibold">
            {typeIcon} {pending.candidate.name}
          </p>
          <p className="mt-0.5 text-muted-foreground leading-relaxed">{pending.candidate.description}</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => books.resolveLorePending(pending.id, "update")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11.5px] font-semibold transition",
            "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400"
          )}
        >
          <RefreshCw className="h-3 w-3" />
          Update existing
        </button>
        {!nameExists && (
          <button
            onClick={() => books.resolveLorePending(pending.id, "create")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11.5px] font-semibold transition",
              "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            <ArrowDownToLine className="h-3 w-3" />
            Keep separate
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * CandidateChips — shows up to 3 "Worth keeping?" lore chips
 * extracted silently after each AI response.
 */
export function CandidateChips({
  books,
  candidates,
  onAccept,
  onDismiss,
}: {
  books: BooksApi;
  candidates: LoreItem[];
  onAccept: (item: LoreItem) => void;
  onDismiss: (id: string) => void;
}) {
  const visible = candidates.slice(0, 3);
  if (!visible.length) return null;

  return (
    <div className="animate-slide-up-fade mt-1.5 space-y-1.5">
      {candidates.length > 0 && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">
          Worth keeping?
        </p>
      )}
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 text-[12px]"
        >
          <span className="mt-0.5 text-base">{TYPE_ICONS[item.type] ?? "◇"}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-none">{item.name}</p>
            <p className="mt-0.5 text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => onAccept(item)}
              className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary hover:bg-primary/20 transition"
            >
              Keep
            </button>
            <button
              onClick={() => onDismiss(item.id)}
              className="rounded-lg bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground hover:bg-muted/70 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
