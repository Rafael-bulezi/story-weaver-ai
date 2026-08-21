import { useMemo, useState } from "react";
import {
  X,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Paperclip,
  Save,
  GitBranch,
} from "lucide-react";
import type { Book, BooksApi, Branch, ContextSelection } from "@/lib/story-store";
import { buildOverview } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastInfo } from "@/lib/toast";

export interface ContextManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  books: BooksApi;
  value: ContextSelection;
  onChange: (v: ContextSelection) => void;
  onOpenTab?: (tab: "lore" | "cores") => void;
}

export function ContextManagerSheet({
  open,
  onOpenChange,
  book,
  books,
  value,
  onChange,
  onOpenTab,
}: ContextManagerSheetProps) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editable drafts for inline editing
  const [overviewDraft, setOverviewDraft] = useState(book.overview ?? "");
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);
  const [loreDescDraft, setLoreDescDraft] = useState("");

  const q = query.trim().toLowerCase();
  
  const matchLore = (name: string) => !q || name.toLowerCase().includes(q);
  const matchCore = (c: { title: string }) => !q || c.title.toLowerCase().includes(q);

  const toggleCore = (id: string) => {
    onChange({
      ...value,
      coreIds: value.coreIds.includes(id)
        ? value.coreIds.filter((x) => x !== id)
        : [...value.coreIds, id],
    });
  };

  const toggleLore = (id: string) => {
    onChange({
      ...value,
      loreIds: value.loreIds.includes(id)
        ? value.loreIds.filter((x) => x !== id)
        : [...value.loreIds, id],
    });
  };

  const autoOverview = useMemo(() => buildOverview({ ...book, overview: undefined }), [book]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-[2.5rem] px-5 pb-6">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold tracking-tight">Context Manager</SheetTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">Manage persistent author canon & scope for this story.</p>
            </div>
            
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
        </SheetHeader>

        {/* Search box */}
        <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cores, characters, places, concepts…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none text-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {/* Active Context Section */}
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Story Canon Context
            </h3>
            <div className="space-y-2">
              {/* Book Overview Item */}
              <ContextInspectorRow
                label="Book Overview"
                description={book.overview ? "Custom overview configured." : "Auto-generated from cores."}
                selected={true}
                expanded={expandedId === "overview"}
                onToggleExpand={() => setExpandedId(expandedId === "overview" ? null : "overview")}
                onCheckboxClick={() => {
                  toastInfo("Book overview is included for general story context.");
                }}
                body={
                  <div className="space-y-3 mt-1 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>EDIT OVERVIEW</span>
                      <button
                        onClick={() => setOverviewDraft(autoOverview)}
                        className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/80"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> Use Auto
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={overviewDraft}
                      onChange={(e) => setOverviewDraft(e.target.value)}
                      placeholder={autoOverview}
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none resize-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setOverviewDraft(book.overview ?? "");
                          setExpandedId(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          books.updateBook(book.id, { overview: overviewDraft.trim() || undefined });
                          toastSuccess("Overview saved");
                          setExpandedId(null);
                        }}
                      >
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                }
              />

              {/* Cores */}
              {book.cores.filter(matchCore).map((core, index) => {
                const isSelected = value.coreIds.includes(core.id);
                return (
                  <ContextInspectorRow
                    key={core.id}
                    label={`Core ${index + 1}: ${core.title}`}
                    description={`${core.blocks.length} block${core.blocks.length !== 1 ? "s" : ""}`}
                    selected={isSelected}
                    expanded={expandedId === `core-${core.id}`}
                    onToggleExpand={() => setExpandedId(expandedId === `core-${core.id}` ? null : `core-${core.id}`)}
                    onCheckboxClick={() => toggleCore(core.id)}
                    body={
                      <div className="space-y-2 mt-2 pt-2 border-t border-border/40 text-xs">
                        {core.blocks.map((b) => (
                          <div key={b.id} className="rounded-lg bg-card/60 p-2 border border-border/40">
                            <span className="font-semibold text-foreground">{b.title}: </span>
                            <span className="text-muted-foreground">{b.body}</span>
                          </div>
                        ))}
                        {onOpenTab && (
                          <button
                            type="button"
                            onClick={() => onOpenTab("cores")}
                            className="text-[11px] text-primary hover:underline font-semibold pt-1"
                          >
                            Open in World Cores →
                          </button>
                        )}
                      </div>
                    }
                  />
                );
              })}

              {/* Lore Items */}
              {book.lore.filter((l) => matchLore(l.name)).map((lore) => {
                const isSelected = value.loreIds.includes(lore.id);
                return (
                  <ContextInspectorRow
                    key={lore.id}
                    label={`${lore.name} (${lore.type.toUpperCase()})`}
                    description={lore.description}
                    selected={isSelected}
                    expanded={expandedId === `lore-${lore.id}`}
                    onToggleExpand={() => {
                      setExpandedId(expandedId === `lore-${lore.id}` ? null : `lore-${lore.id}`);
                      setEditingLoreId(lore.id);
                      setLoreDescDraft(lore.description);
                    }}
                    onCheckboxClick={() => toggleLore(lore.id)}
                    body={
                      <div className="space-y-2 mt-2 pt-2 border-t border-border/40 text-xs">
                        <textarea
                          rows={2}
                          value={editingLoreId === lore.id ? loreDescDraft : lore.description}
                          onChange={(e) => setLoreDescDraft(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground outline-none resize-none"
                        />
                        <div className="flex justify-between items-center">
                          {onOpenTab && (
                            <button
                              type="button"
                              onClick={() => onOpenTab("lore")}
                              className="text-[11px] text-primary hover:underline font-semibold"
                            >
                              Open in Lore Inspector →
                            </button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              books.updateLore(lore.id, { description: loreDescDraft });
                              toastSuccess(`Updated lore: ${lore.name}`);
                              setExpandedId(null);
                            }}
                          >
                            Save Lore
                          </Button>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ContextInspectorRow({
  label,
  description,
  selected,
  expanded,
  onToggleExpand,
  onCheckboxClick,
  body,
}: {
  label: string;
  description?: string;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onCheckboxClick: () => void;
  body?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-3 transition-all duration-200",
      selected ? "border-primary/40 bg-card/70" : "border-border/60 bg-card/30 opacity-75"
    )}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2.5 text-left min-w-0"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-foreground flex items-center gap-1.5">
              <span className="truncate">{label}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
            {description && (
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{description}</div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onCheckboxClick}
          aria-label={selected ? "Remove from context" : "Add to context"}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90",
            selected
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border hover:border-emerald-500/50"
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
      </div>

      {expanded && body && (
        <div className="mt-2 text-xs text-muted-foreground">
          {body}
        </div>
      )}
    </div>
  );
}
