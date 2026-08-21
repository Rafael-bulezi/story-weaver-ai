import { useState } from "react";
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
 * CandidateChips — shows "Worth keeping?" lore chips extracted silently
 * after each AI response. Collapsible & interactive.
 */
export function CandidateChips({
  candidates,
  onKeep,
  onCancel,
  onAccept,
  onDismiss,
  books,
}: {
  candidates: LoreItem[];
  onKeep?: (item: LoreItem) => void;
  onCancel?: (id: string) => void;
  onAccept?: (item: LoreItem) => void;
  onDismiss?: (id: string) => void;
  books?: BooksApi;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visible = candidates.slice(0, 3);
  if (!visible.length) return null;

  const handleAccept = (item: LoreItem) => {
    if (onKeep) onKeep(item);
    else if (onAccept) onAccept(item);
    else if (books) {
      books.addLore({ type: item.type, name: item.name, description: item.description });
      books.removeCandidate(item.id);
    }
  };

  const handleDismiss = (id: string) => {
    if (onCancel) onCancel(id);
    else if (onDismiss) onDismiss(id);
    else if (books) {
      books.removeCandidate(id);
    }
  };

  return (
    <div className="animate-slide-up-fade mt-2 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xs p-2.5 space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer select-none px-1"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>💡 Worth keeping?</span>
          <span className="rounded-full bg-primary/10 text-primary font-mono text-[9px] px-1.5 py-0.2">
            {candidates.length}
          </span>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs font-mono"
        >
          {collapsed ? "Expand ▼" : "Collapse ▲"}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-1.5 pt-0.5">
          {visible.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-[12px] shadow-xs"
            >
              <span className="mt-0.5 text-base shrink-0">{TYPE_ICONS[item.type] ?? "💡"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground leading-none">{item.name}</p>
                <p className="mt-1 text-muted-foreground text-[11.5px] leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => handleAccept(item)}
                  className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** LoreTagRenderer: Inline semantic highlighting for lore entity mentions with peek tooltip & click-to-open */
export function LoreTagRenderer({
  text,
  loreItems = [],
  onOpenTab,
}: {
  text: string;
  loreItems?: LoreItem[];
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
}) {
  if (!loreItems || loreItems.length === 0 || !text) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }


  const escapedLore = loreItems
    .map((l) => l.name.trim())
    .filter((n) => n.length > 2)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escapedLore.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const pattern = new RegExp(`\\b(${escapedLore.join("|")})\\b`, "gi");
  const parts = text.split(pattern);

  const TYPE_STYLES: Record<string, { btn: string; badge: string; icon: string }> = {
    character: {
      btn: "border-blue-500/70 text-blue-800 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      icon: "👤",
    },
    place: {
      btn: "border-emerald-500/70 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      icon: "📍",
    },
    concept: {
      btn: "border-amber-500/70 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: "💡",
    },
    faction: {
      btn: "border-purple-500/70 text-purple-800 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20",
      badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      icon: "⚔️",
    },
  };

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        const matchingItem = loreItems.find(
          (l) => l.name.trim().toLowerCase() === part.trim().toLowerCase()
        );
        if (matchingItem) {
          const typeStyle = TYPE_STYLES[matchingItem.type] ?? TYPE_STYLES.concept;
          return (
            <span key={i} className="relative inline-block group/loretag">
              <button
                type="button"
                onClick={() => onOpenTab?.("lore", matchingItem.id)}
                className={cn(
                  "mx-0.5 rounded px-1.5 py-0.5 text-[12.5px] font-medium border-b border-dotted transition cursor-pointer inline-flex items-center gap-1",
                  typeStyle.btn
                )}
                title={`Click to inspect ${matchingItem.name} (${matchingItem.type}) in Lore Library`}
              >
                <span>{part}</span>
              </button>

              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-60 -translate-x-1/2 rounded-xl border border-border bg-card p-3 shadow-2xl group-hover/loretag:block animate-slide-up-fade">
                <div className="flex items-center justify-between gap-1 border-b border-border/50 pb-1.5 mb-1.5">
                  <span className="font-bold text-[12px] text-foreground truncate flex items-center gap-1">
                    <span>{typeStyle.icon}</span>
                    <span>{matchingItem.name}</span>
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shrink-0", typeStyle.badge)}>
                    {matchingItem.type}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed font-sans">
                  {matchingItem.description || "No description provided."}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[9.5px] font-bold text-primary">
                  <span className="h-2 w-2">↗</span>
                  <span>Click to open in World Inspector</span>
                </div>
              </div>
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

/** ChunkedCardsRenderer: Renders multi-section or structured AI responses as collapsible info cards */
export function ChunkedCardsRenderer({
  text,
  loreItems = [],
  onOpenTab,
}: {
  text: string;
  loreItems?: LoreItem[];
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
}) {
  const hasHeadings = /^#{2,3}\s+/m.test(text);

  // If no markdown headings, render as standard highlighted text
  if (!hasHeadings || text.length < 250) {
    return <LoreTagRenderer text={text} loreItems={loreItems} onOpenTab={onOpenTab} />;
  }

  // Split into sections by markdown heading (## or ###)
  const sections: Array<{ title: string; body: string }> = [];
  const rawParts = text.split(/(?=^#{2,3}\s+)/m);

  rawParts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^#{2,3}\s+(.+?)(?:\r?\n|$)([\s\S]*)/);
    if (match) {
      sections.push({ title: match[1].trim(), body: match[2].trim() });
    } else {
      sections.push({ title: "Overview", body: trimmed });
    }
  });

  if (sections.length <= 1) {
    return <LoreTagRenderer text={text} loreItems={loreItems} onOpenTab={onOpenTab} />;
  }

  return (
    <div className="my-2 space-y-2">
      {sections.map((sec, idx) => (
        <CollapsibleSectionCard
          key={idx}
          title={sec.title}
          body={sec.body}
          defaultOpen={idx === 0}
          borderAccentIndex={idx}
          loreItems={loreItems}
          onOpenTab={onOpenTab}
        />
      ))}
    </div>
  );
}

function CollapsibleSectionCard({
  title,
  body,
  defaultOpen,
  borderAccentIndex,
  loreItems,
  onOpenTab,
}: {
  title: string;
  body: string;
  defaultOpen: boolean;
  borderAccentIndex: number;
  loreItems: LoreItem[];
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const borderAccents = [
    "border-l-blue-500",
    "border-l-violet-500",
    "border-l-amber-500",
    "border-l-teal-500",
  ];
  const borderAccent = borderAccents[borderAccentIndex % borderAccents.length];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-sm transition-all border-l-4",
        borderAccent
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-semibold text-[13px] text-foreground flex items-center gap-1.5">
          <BookMarked className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {title}
        </span>
        <span className="text-muted-foreground text-[11px] font-mono">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-3.5 py-2.5 text-[13px] text-foreground/90">
          <LoreTagRenderer text={body} loreItems={loreItems} onOpenTab={onOpenTab} />
        </div>
      )}
    </div>
  );
}

