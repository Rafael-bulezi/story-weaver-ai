import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Sparkles,
  Compass,
  MessageSquare,
  Globe,
  BookMarked,
  LayoutGrid,
  List,
  Edit3,
  Users,
  ChevronRight,
  X,
  PenTool,
} from "lucide-react";
import { useBooks } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import type { ComposerMode } from "./SidebarNav";

export type ViewMode = "grid" | "list";
export type SortBy = "recent" | "name" | "progress";

/* ──────────────────────────────────────────────────────────────
   COMPOSER MODAL
   ────────────────────────────────────────────────────────────── */
export function ComposerModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, mode: ComposerMode, options: { genre?: string; prompt?: string }) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ComposerMode>("chat");
  const [genre, setGenre] = useState("");
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setMode("chat");
      setGenre("");
      setPrompt("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const modes: { id: ComposerMode; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    { id: "chat", label: "Free Write", desc: "Open conversation with your AI co-author", icon: MessageSquare, color: "text-blue-500" },
    { id: "brainstorm", label: "Brainstorm", desc: "Generate ideas, lore, and plot points", icon: Sparkles, color: "text-amber-500" },
    { id: "worldbuild", label: "World Build", desc: "Create maps, cultures, and magic systems", icon: Globe, color: "text-emerald-500" },
    { id: "outline", label: "Outline", desc: "Structure chapters and story arcs", icon: PenTool, color: "text-violet-500" },
  ];

  const genres = ["Fantasy", "Sci-Fi", "Horror", "Mystery", "Romance", "Thriller", "Historical", "Literary", "None"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {step === 1 ? "Start a New Story" : "Configure Your World"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {step === 1 ? "Choose how you want to begin" : "Set the foundation for your narrative"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: Mode Selection */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md",
                    mode === m.id
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/20"
                  )}
                >
                  <m.icon className={cn("h-5 w-5", m.color)} />
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Story Name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Chronicles of Astrisol"
                className="h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <button
              onClick={() => name.trim() && setStep(2)}
              disabled={!name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      genre === g
                        ? "border-primary/40 bg-primary/10 text-primary font-medium"
                        : "border-border/60 text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Starting Prompt (optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your world, a character, or a scene to get started..."
                rows={3}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-border/60 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onCreate(name, mode, { genre: genre || undefined, prompt: prompt || undefined });
                  onClose();
                }}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:shadow-md active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Create Story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   EMPTY STATE
   ────────────────────────────────────────────────────────────── */
export function EmptyLibraryState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-10 w-10 text-primary/60" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>
      <h2 className="font-serif text-2xl font-semibold">Your library is waiting</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Every great story starts with a single word. Create your first book and let the AI help you weave worlds that remember themselves.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create Your First Story
        </button>
        <button
          onClick={onCreate}
          className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Compass className="h-4 w-4" />
          Explore Templates
        </button>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
        {[
          { icon: MessageSquare, label: "AI Chat", desc: "Converse with your story" },
          { icon: Globe, label: "World Building", desc: "Craft living worlds" },
          { icon: BookMarked, label: "Lore Tracking", desc: "Never lose a detail" },
        ].map((feature) => (
          <div key={feature.label} className="rounded-xl border border-border/40 bg-card/50 p-3">
            <feature.icon className="h-5 w-5 text-primary/60 mx-auto mb-2" />
            <div className="text-xs font-medium">{feature.label}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{feature.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   QUICK ACTIONS BAR
   ────────────────────────────────────────────────────────────── */
export function QuickActionsBar({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  onSearch,
}: {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/40">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search your stories..."
          onChange={(e) => onSearch(e.target.value)}
          className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          className="h-8 rounded-lg border border-border/60 bg-card px-2 text-xs text-foreground focus:outline-none"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="progress">Progress</option>
        </select>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   BOOK CARD (Grid)
   ────────────────────────────────────────────────────────────── */
export function BookCard({
  book,
  onClick,
  isActive,
  justCreated,
}: {
  book: ReturnType<typeof useBooks>["books"][0];
  onClick: () => void;
  isActive: boolean;
  justCreated?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative rounded-2xl border p-5 text-left transition-all duration-200",
        isActive
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : justCreated
          ? "border-primary/40 ring-4 ring-primary/10 bg-primary/5"
          : "border-border/70 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-serif text-2xl transition-colors",
          isActive
            ? "bg-primary/20 text-primary"
            : "bg-[color:var(--writer-bg)] text-[color:var(--writer)] font-semibold"
        )}>
          {book.cover ?? "◇"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "truncate font-serif text-lg font-semibold text-foreground",
              isActive && "text-primary"
            )}>
              {book.name}
            </div>
            {justCreated && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground animate-pulse shrink-0">
                new
              </span>
            )}
            {isHovered && !justCreated && (
              <Edit3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          {book.title && (
            <div className="truncate text-xs text-muted-foreground font-medium mt-0.5">{book.title}</div>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {book.content.trim().slice(0, 160) || "Empty draft — tap to begin weaving your story."}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" /> {book.lore.length} lore
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {book.cores.length} cores
          </span>
          <span className="flex items-center gap-1">
            <BookMarked className="h-3 w-3" /> {book.chapters.length} chapters
          </span>
        </div>
        <div className={cn(
          "h-2 w-2 rounded-full transition-colors",
          book.chapters.length > 0 ? "bg-emerald-500" : "bg-amber-500"
        )} />
      </div>

      {/* Progress bar */}
      {book.chapters.length > 0 && (
        <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${Math.min((book.chapters.length / 10) * 100, 100)}%` }}
          />
        </div>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   BOOK ROW (List)
   ────────────────────────────────────────────────────────────── */
export function BookRow({
  book,
  onClick,
  isActive,
  justCreated,
}: {
  book: ReturnType<typeof useBooks>["books"][0];
  onClick: () => void;
  isActive: boolean;
  justCreated?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all",
        isActive
          ? "border-primary/40 bg-primary/5"
          : justCreated
          ? "border-primary/40 ring-4 ring-primary/10 bg-primary/5"
          : "border-border/60 bg-card hover:border-primary/30"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-serif text-xl",
        isActive ? "bg-primary/20 text-primary" : "bg-muted text-foreground font-semibold"
      )}>
        {book.cover ?? "◇"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className={cn("truncate font-medium text-foreground", isActive && "text-primary font-semibold")}>{book.name}</div>
          {justCreated && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground animate-pulse shrink-0">
              new
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground mt-0.5">
          <span>{book.lore.length} lore</span>
          <span>·</span>
          <span>{book.cores.length} cores</span>
          <span>·</span>
          <span>{book.chapters.length} chapters</span>
        </div>
      </div>
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )} />
    </button>
  );
}
