import { useMemo, useState } from "react";
import {
  X,
  Plus,
  Diamond,
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
import type { Book, BooksApi, Branch } from "@/lib/story-store";
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

export interface ContextSelection {
  coreIds: string[];
  loreIds: string[];
}

export function ContextStrip({
  book,
  books,
  value,
  onChange,
  onOpenTab,
}: {
  book: Book;
  books: BooksApi;
  value: ContextSelection;
  onChange: (v: ContextSelection) => void;
  onOpenTab?: (tab: "lore" | "cores") => void;
}) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editable drafts for inline editing
  const [overviewDraft, setOverviewDraft] = useState(book.overview ?? "");
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);
  const [loreDescDraft, setLoreDescDraft] = useState("");

  const q = query.trim().toLowerCase();
  
  const matchLore = (name: string) => !q || name.toLowerCase().includes(q);
  const matchCore = (c: { title: string }) => !q || c.title.toLowerCase().includes(q);

  const coreChips = useMemo(
    () => book.cores.filter((c) => value.coreIds.includes(c.id)),
    [book.cores, value.coreIds],
  );
  
  const loreChips = useMemo(
    () => book.lore.filter((l) => value.loreIds.includes(l.id)),
    [book.lore, value.loreIds],
  );

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

  // Helper for auto-generating overview
  const autoOverview = useMemo(() => buildOverview({ ...book, overview: undefined }), [book]);

  return (
    <>
      {/* Horizontal Strip on main screen */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 text-[11px] no-scrollbar border-b border-border/40 bg-card/20">
        <span className="shrink-0 text-muted-foreground font-semibold">Using:</span>
        
        {/* Overview button */}
        <button
          type="button"
          onClick={() => {
            setOverviewDraft(book.overview ?? "");
            setExpandedId("overview");
            setManagerOpen(true);
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--writer-bg)] px-2.5 py-1 font-semibold text-[color:var(--writer)] hover:brightness-95 shadow-sm"
        >
          <Diamond className="h-2.5 w-2.5" /> Overview
        </button>

        {/* Selected Cores */}
        {coreChips.map((c, i) => (
          <Chip
            key={c.id}
            label={`Core ${book.cores.indexOf(c) + 1 || i + 1}`}
            onClick={() => {
              setExpandedId(`core-${c.id}`);
              setManagerOpen(true);
            }}
            onRemove={() => toggleCore(c.id)}
          />
        ))}

        {/* Selected Lore */}
        {loreChips.map((l) => (
          <Chip
            key={l.id}
            label={l.name}
            onClick={() => {
              setExpandedId(`lore-${l.id}`);
              setManagerOpen(true);
            }}
            onRemove={() => toggleLore(l.id)}
          />
        ))}

        {/* Branches */}
        {books.branches && books.branches.map((b: Branch) => {
          const isActive = books.activeBranchId === b.id;
          return (
            <BranchChip
              key={b.id}
              branch={b}
              isActive={isActive}
              onClick={() => books.setActiveBranch(isActive ? null : b.id)}
              onRemove={() => {
                books.deleteBranch(b.id);
                if (isActive) books.setActiveBranch(null);
              }}
              onRename={(newName) => books.renameBranch(b.id, newName)}
            />
          );
        })}

        {/* (+) Open Context Manager */}
        <button
          type="button"
          onClick={() => {
            setExpandedId(null);
            setManagerOpen(true);
          }}
          aria-label="Add to context"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* RAMPED-UP UNIFIED CONTEXT MANAGER SHEET */}
      <Sheet open={managerOpen} onOpenChange={setManagerOpen}>
        <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-[2.5rem] px-5 pb-6">
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold tracking-tight">Context</SheetTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5">Why the AI understands this.</p>
              </div>
              
              {/* Auto context badge toggle mock */}
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto Context
              </span>
            </div>
          </SheetHeader>

          {/* Search box inside the lightbox */}
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
            {/* Active Context for this Thread Section */}
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Active Context for this Thread
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
                    toastInfo("Book overview is required for general book context.");
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
                          <Save className="mr-1 h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                  }
                />

                {/* Selected Cores */}
                {coreChips.map((c) => {
                  const idx = book.cores.indexOf(c);
                  return (
                    <ContextInspectorRow
                      key={c.id}
                      label={`Core ${idx + 1}: ${c.title}`}
                      description={`${c.blocks.length} sub-core facts attached.`}
                      selected={true}
                      expanded={expandedId === `core-${c.id}`}
                      onToggleExpand={() => setExpandedId(expandedId === `core-${c.id}` ? null : `core-${c.id}`)}
                      onCheckboxClick={() => toggleCore(c.id)}
                      body={
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
                          <div className="flex items-center justify-between text-[10.5px] font-semibold text-muted-foreground">
                            <span>CANONICAL FACTS</span>
                            <button
                              onClick={() => {
                                setManagerOpen(false);
                                onOpenTab?.("cores");
                              }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Manage Cores
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                            {c.blocks.map((bl, bi) => (
                              <div key={bl.id} className="rounded-lg bg-muted/40 p-2 text-xs">
                                <div className="font-semibold text-foreground">{idx + 1}.{bi + 1} {bl.title}</div>
                                <div className="text-muted-foreground mt-0.5">{bl.body}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      }
                    />
                  );
                })}

                {/* Selected Lore */}
                {loreChips.map((l) => (
                  <ContextInspectorRow
                    key={l.id}
                    label={l.name}
                    description={`${l.type.toUpperCase()}${l.role ? ` · ${l.role}` : ""}`}
                    selected={true}
                    expanded={expandedId === `lore-${l.id}`}
                    onToggleExpand={() => setExpandedId(expandedId === `lore-${l.id}` ? null : `lore-${l.id}`)}
                    onCheckboxClick={() => toggleLore(l.id)}
                    body={
                      <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
                        {editingLoreId === l.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={loreDescDraft}
                              onChange={(e) => setLoreDescDraft(e.target.value)}
                              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none resize-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingLoreId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  books.updateLore(l.id, { description: loreDescDraft.trim() });
                                  toastSuccess("Lore description saved");
                                  setEditingLoreId(null);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-[10.5px] font-semibold text-muted-foreground">
                              <span>DESCRIPTION</span>
                              <button
                                onClick={() => {
                                  setLoreDescDraft(l.description);
                                  setEditingLoreId(l.id);
                                }}
                                className="text-[10px] text-primary hover:underline"
                              >
                                Edit description
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {l.description || "No description configured."}
                            </p>
                          </>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            </div>

            {/* Related Concepts / Unselected Lore */}
            {book.lore.filter((l) => !value.loreIds.includes(l.id)).length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Related Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {book.lore
                    .filter((l) => !value.loreIds.includes(l.id) && matchLore(l.name))
                    .map((l) => (
                      <button
                        key={l.id}
                        onClick={() => toggleLore(l.id)}
                        className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/45 hover:text-foreground active:scale-95 transition-transform"
                      >
                        <Plus className="h-3 w-3" /> {l.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Pinned References / Attachments / Drafts */}
            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Pinned References
              </h3>
              
              <div className="space-y-2">
                {/* Dynamically list core attachments if any exist */}
                {book.cores.some((c) => (c.attachments?.length ?? 0) > 0) ? (
                  book.cores.flatMap((c) => c.attachments || []).map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Paperclip className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-foreground">{att.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Core Attachment</div>
                        </div>
                      </div>
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        className="text-xs font-semibold text-[color:var(--writer)] hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Visual mockup references for design consistency */}
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Paperclip className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-foreground">Royal Observatory Records</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Last used 1d ago</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Pinned</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Paperclip className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-foreground">Lumen Energy Pattern</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Visual Reference · Last used 2d ago</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Pinned</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* General Search / Unselected Cores */}
            {book.cores.filter((c) => !value.coreIds.includes(c.id)).length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Add Cores to Context
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {book.cores
                    .filter((c) => !value.coreIds.includes(c.id) && matchCore(c))
                    .map((c) => {
                      const idx = book.cores.indexOf(c);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCore(c.id)}
                          className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-left text-xs hover:border-primary/45 hover:shadow-sm"
                        >
                          <span className="font-semibold text-muted-foreground">Core {idx + 1} — {c.title}</span>
                          <Plus className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
            
            {/* Sparkle tip card */}
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                The AI automatically pulls what matters. You can search, pin, add, or remove anything from context using this panel.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Chip({
  label,
  onClick,
  onRemove,
}: {
  label: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm transition">
      <button type="button" onClick={onClick} className="hover:underline">
        {label}
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground/60 hover:text-foreground/80 pl-0.5"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
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
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-primary/20 transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-left min-w-0 flex items-center gap-2 group"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
              {label}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            {description && (
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{description}</div>
            )}
          </div>
        </button>

        {/* Checkbox button */}
        <button
          type="button"
          onClick={onCheckboxClick}
          aria-label={selected ? "Remove from context" : "Add to context"}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90",
            selected
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border hover:border-emerald-500/50",
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
      </div>

      {/* Expanded Details / Inline Editor */}
      {expanded && body && (
        <div className="mt-2 text-xs text-muted-foreground">
          {body}
        </div>
      )}
    </div>
  );
}

function BranchChip({
  branch,
  isActive,
  onClick,
  onRemove,
  onRename,
}: {
  branch: any;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(branch.name);

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== branch.name) {
      onRename(editName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (editName.trim() && editName.trim() !== branch.name) {
        onRename(editName.trim());
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(branch.name);
    }
  };

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition shadow-sm",
        isActive
          ? "border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-muted/40 border border-transparent text-muted-foreground hover:bg-muted"
      )}
    >
      <GitBranch className="h-3 w-3 shrink-0" />
      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none w-20 text-[11px] font-semibold text-foreground border-b border-amber-500/60"
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          onDoubleClick={() => setIsEditing(true)}
          className="hover:underline text-[11.5px] font-semibold"
          title="Double click to rename"
        >
          {branch.name}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove branch ${branch.name}`}
        className="text-muted-foreground/60 hover:text-foreground/80 pl-0.5"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
