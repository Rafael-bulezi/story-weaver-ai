// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Menu,
  Plus,
  ArrowUp,
  Library,
  BookMarked,
  Settings,
  MessageSquare,
  Sparkles,
  Globe,
  Users,
  Feather,
  ChevronRight,
  Search,
  Clock,
  Star,
  Trash2,
  MoreHorizontal,
  Edit3,
  X,
  Wand2,
  Zap,
  BookOpen,
  Compass,
  PenTool,
  LayoutGrid,
  List,
  PanelLeft,
  PanelLeftClose,
  Command,
  Keyboard,
} from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useBooks } from "@/lib/story-store";
import { BottomNav, type NavTab } from "@/components/story/BottomNav";
import { ChatTab } from "@/components/story/ChatTab";
import { BrainstormTab } from "@/components/story/BrainstormTab";
import { LoreTab } from "@/components/story/LoreTab";
import { CoresTab } from "@/components/story/CoresTab";
import { StudioTab } from "@/components/story/StudioTab";
import { SideMenu } from "@/components/story/SideMenu";
import { ChaptersSheet } from "@/components/story/ChaptersSheet";
import { SettingsSheet } from "@/components/story/SettingsSheet";
import { CharacterGallery } from "@/components/story/CharacterGallery";
import { getSavedSettings, applySettingsThemeAndAccent } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

const QUICK_STARTS = [
  { label: "Continue a world", seed: "Let's continue building out the world of " },
  { label: "New character", seed: "Help me create a new character who " },
  { label: "Plot outline", seed: "Help me outline the plot for " },
];

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { title: "LoreWeave — AI storytelling workspace" },
      {
        name: "description",
        content:
          "Mobile-first AI storytelling workspace with living world cores, brainstorm chat, and canonical lore.",
      },
      { property: "og:title", content: "LoreWeave — Write worlds that remember themselves" },
      {
        property: "og:description",
        content: "AI storytelling workspace with world cores, brainstorm chat, and canonical lore.",
      },
    ],
  }),
});

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */
type ComposerMode = "chat" | "brainstorm" | "worldbuild" | "outline";
type ViewMode = "grid" | "list";
type SortBy = "recent" | "name" | "progress";

/* ──────────────────────────────────────────────────────────────
   SIDEBAR NAVIGATION COMPONENT
   ────────────────────────────────────────────────────────────── */
function SidebarNav({
  isOpen,
  onToggle,
  books,
  onCreateBook,
  onSelectBook,
  activeBookId,
  recentBooks,
  favorites,
}: {
  isOpen: boolean;
  onToggle: () => void;
  books: ReturnType<typeof useBooks>;
  onCreateBook: (mode?: ComposerMode) => void;
  onSelectBook: (id: string) => void;
  activeBookId: string | null;
  recentBooks: string[];
  favorites: string[];
}) {
  const [activeSection, setActiveSection] = useState<"library" | "recent" | "favorites" | "trash">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredBooks = books.books.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const recentItems = filteredBooks.filter((b) => recentBooks.includes(b.id));
  const favoriteItems = filteredBooks.filter((b) => favorites.includes(b.id));

  const navItems = [
    { id: "library" as const, label: "Library", icon: Library, count: books.books.length },
    { id: "recent" as const, label: "Recent", icon: Clock, count: recentBooks.length },
    { id: "favorites" as const, label: "Favorites", icon: Star, count: favorites.length },
  ];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border/60 bg-card/50 backdrop-blur-xl transition-all duration-300 ease-out",
        isOpen ? "w-[280px]" : "w-[52px]"
      )}
    >
      {/* Logo / Toggle */}
      <div className={cn(
        "flex h-14 items-center border-b border-border/40 px-3",
        isOpen ? "gap-3" : "justify-center"
      )}>
        <button
          onClick={onToggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
        {isOpen && (
          <button
            onClick={() => books.setActiveId(null)}
            className="flex items-center gap-2.5 overflow-hidden hover:opacity-80 transition-opacity"
            title="Go to Library"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black text-white">
              <svg viewBox="0 0 450 411" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current">
                <g transform="translate(0,411) scale(0.1,-0.1)">
                  <path d="M1868 3766 c-53 -11 -100 -24 -103 -28 -4 -4 10 -21 31 -39 72 -61 154 -153 214 -241 55 -79 148 -254 180 -338 7 -19 17 -39 21 -44 14 -16 53 136 53 210 1 65 -3 79 -47 167 -51 104 -139 227 -209 293 l-43 41 -97 -21z M2673 3698 c-138 -147 -271 -430 -308 -661 -8 -51 -15 -159 -15 -242 l-1 -150 -56 65 c-316 364 -680 586 -1100 671 -100 20 -103 20 -126 2 -54 -43 -157 -137 -157 -144 0 -4 26 -11 58 -14 519 -60 972 -337 1299 -793 274 -383 442 -867 443 -1277 0 -112 -11 -123 -49 -48 -56 112 -175 277 -261 364 -185 187 -375 269 -624 269 -146 0 -251 -23 -373 -80 -161 -75 -294 -193 -388 -345 -47 -74 -105 -216 -105 -254 0 -18 129 -141 147 -141 5 0 15 28 21 63 7 36 33 106 63 167 45 92 64 117 143 195 127 127 239 183 411 206 201 26 405 -50 566 -212 214 -214 359 -565 359 -866 l0 -73 265 0 265 0 0 198 c0 305 29 500 100 679 73 181 154 293 391 538 183 189 244 268 278 361 62 166 36 343 -69 456 -173 189 -451 197 -630 18 -91 -91 -130 -193 -130 -340 0 -131 -18 -247 -50 -322 -25 -60 -186 -307 -201 -308 -3 0 -16 35 -29 78 -13 42 -61 170 -106 283 -141 350 -177 505 -177 749 1 325 103 594 313 823 29 32 51 59 49 61 -11 8 -156 56 -170 56 -8 0 -29 -15 -46 -32z m958 -1156 c130 -68 154 -230 57 -377 -18 -27 -116 -136 -218 -241 -217 -224 -291 -323 -400 -536 -44 -86 -85 -160 -90 -163 -16 -10 -33 46 -33 110 0 168 134 388 418 683 81 84 145 155 143 157 -4 4 -204 -51 -218 -60 -10 -6 -1 222 12 277 32 146 195 220 329 150z M3375 3286 c-149 -24 -264 -74 -390 -169 -120 -91 -215 -230 -250 -364 -21 -80 -19 -204 5 -299 20 -78 103 -264 119 -264 4 0 1 33 -6 73 -18 87 -11 264 12 351 40 144 117 266 225 350 135 105 261 147 442 148 l108 0 -19 26 c-19 28 -156 163 -163 161 -1 -1 -39 -7 -83 -13z M675 2831 c-45 -5 -52 -10 -72 -46 -12 -22 -32 -66 -43 -99 l-20 -59 53 7 c214 29 319 33 457 16 79 -10 283 -55 304 -68 5 -3 -43 -16 -106 -28 -257 -52 -499 -160 -710 -316 l-80 -60 7 -106 c4 -59 9 -109 11 -111 1 -2 37 26 78 62 247 215 553 346 887 379 161 15 263 2 334 -46 55 -36 195 -163 195 -176 0 -4 -18 -4 -40 1 -155 35 -361 28 -517 -17 -316 -92 -607 -333 -763 -633 l-34 -65 44 -83 c51 -98 68 -117 77 -84 11 45 76 168 130 249 143 216 371 382 615 450 48 13 101 17 228 17 154 -1 171 -3 250 -29 165 -55 310 -142 443 -266 42 -39 77 -70 77 -67 0 23 -63 174 -117 278 -249 488 -720 824 -1251 894 -111 15 -338 18 -437 6z" />
                </g>
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">LoreWeave</span>
          </button>
        )}
      </div>

      {/* New Button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => onCreateBook()}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
            !isOpen && "justify-center px-0"
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {isOpen && <span>New Story</span>}
        </button>
      </div>

      {/* Search */}
      {isOpen && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto thin-scrollbar px-2 py-1">
        <div className={cn("mb-2", !isOpen && "flex flex-col items-center gap-1")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                // "Library" nav item navigates back to the library hub
                if (item.id === "library") {
                  books.setActiveId(null);
                }
              }}
              title={!isOpen ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                activeSection === item.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground hover:bg-muted hover:text-foreground",
                !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {isOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-xs text-muted-foreground font-medium">{item.count}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        {isOpen && <div className="my-2 border-t border-border/40" />}

        {/* Book List */}
        {isOpen && (
          <div className="space-y-0.5">
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {activeSection === "library" && "All Stories"}
              {activeSection === "recent" && "Recently Opened"}
              {activeSection === "favorites" && "Favorites"}
            </div>
            {(activeSection === "library" ? filteredBooks : activeSection === "recent" ? recentItems : favoriteItems).map((b) => (
              <button
                key={b.id}
                onClick={() => onSelectBook(b.id)}
                onMouseEnter={() => setHoveredItem(b.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  activeBookId === b.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-serif",
                    activeBookId === b.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-foreground font-semibold"
                  )}
                >
                  {b.cover ?? "◇"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "truncate text-sm font-medium",
                    activeBookId === b.id ? "text-primary font-semibold" : "text-foreground"
                  )}>
                    {b.name}
                  </div>
                  {b.title && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {b.title}
                    </div>
                  )}
                </div>
                {hoveredItem === b.id && (
                  <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className={cn(
        "border-t border-border/40 p-2",
        !isOpen && "flex flex-col items-center gap-1"
      )}>
        <button
          onClick={() => setActiveSection("trash")}
          title={!isOpen ? "Trash" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted",
            !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
          )}
        >
          <Trash2 className="h-4 w-4" />
          {isOpen && <span>Trash</span>}
        </button>
        <button
          title={!isOpen ? "Shortcuts" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted",
            !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
          )}
        >
          <Keyboard className="h-4 w-4" />
          {isOpen && <span className="flex-1">Shortcuts</span>}
          {isOpen && <span className="text-[10px] text-muted-foreground font-mono">⌘K</span>}
        </button>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────
   COMPOSER MODAL
   ────────────────────────────────────────────────────────────── */
function ComposerModal({
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
function EmptyLibraryState({ onCreate }: { onCreate: () => void }) {
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
function QuickActionsBar({
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
function BookCard({
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
function BookRow({
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

/* ──────────────────────────────────────────────────────────────
   MAIN APP
   ────────────────────────────────────────────────────────────── */
function StoryCanvasApp() {
  const books = useBooks();
  const active = books.active;
  const [tab, setTab] = useState<NavTab>("chat");
  const [sideOpen, setSideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentBooks, setRecentBooks] = useState<string[]>([]);
  const [favorites] = useState<string[]>([]);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  // Apply theme settings on load
  useEffect(() => {
    const settings = getSavedSettings();
    applySettingsThemeAndAccent(settings);
  }, []);

  // Track recently opened books
  const handleSelectBook = useCallback((id: string) => {
    setRecentBooks((prev) => {
      const filtered = prev.filter((bid) => bid !== id);
      return [id, ...filtered].slice(0, 10);
    });
    books.setActiveId(id);
  }, [books]);

  const handleQuickStart = useCallback((seed: string) => {
    setComposerValue(seed);
    composerRef.current?.focus();
  }, []);

  const handleComposerSubmit = useCallback(() => {
    const trimmed = composerValue.trim();
    if (!trimmed) return;
    const name = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
    const id = books.createBook({ name, content: trimmed });
    handleSelectBook(id);
    setJustCreated(id);
    setComposerValue("");
    setTimeout(() => setJustCreated(null), 2400);
  }, [books, composerValue, handleSelectBook]);

  const handleBlankBook = useCallback(() => {
    const id = books.createBook({ name: "Untitled Book" });
    handleSelectBook(id);
    setJustCreated(id);
    setTimeout(() => setJustCreated(null), 2400);
  }, [books, handleSelectBook]);

  // Create book from composer
  const handleCreateBook = useCallback((name: string, mode: ComposerMode, options: { genre?: string; prompt?: string }) => {
    const id = books.createBook({
      name: name || "Untitled Book",
      title: options.genre,
      content: options.prompt || "",
    });
    handleSelectBook(id);

    // Route to appropriate tab based on mode
    const tabMap: Record<ComposerMode, NavTab> = {
      chat: "chat",
      brainstorm: "brainstorm",
      worldbuild: "cores",
      outline: "studio",
    };
    setTab(tabMap[mode]);
  }, [books, handleSelectBook]);

  // Quick create (from sidebar)
  const handleQuickCreate = useCallback((mode?: ComposerMode) => {
    if (mode) {
      setComposerOpen(true);
    } else {
      const id = books.createBook({ name: "Untitled Book" });
      handleSelectBook(id);
    }
  }, [books, handleSelectBook]);

  // Filter books
  const filteredBooks = books.books.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "progress") return b.chapters.length - a.chapters.length;
    // recent: use recentBooks order
    const aIdx = recentBooks.indexOf(a.id);
    const bIdx = recentBooks.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  // ============ BOOK VIEW ============
  if (active) {
    return (
      <div className="flex h-[100dvh] bg-background text-foreground">
        {/* Sidebar */}
        <SidebarNav
          isOpen={sideOpen}
          onToggle={() => setSideOpen(!sideOpen)}
          books={books}
          onCreateBook={handleQuickCreate}
          onSelectBook={handleSelectBook}
          activeBookId={active.id}
          recentBooks={recentBooks}
          favorites={favorites}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="flex min-w-0 items-center gap-2 py-2">
              {!sideOpen && (
                <button
                  onClick={() => setSideOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted mr-1"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {active.title || "Book"}
                </span>
                <span className="truncate text-[13px] font-semibold">{active.name}</span>
              </div>
            </div>

            {/* Desktop tab bar — hidden on mobile */}
            <nav className="hidden lg:flex items-center gap-0.5 rounded-xl border border-border/50 bg-muted/40 p-1">
              {([
                { id: "chat" as NavTab, label: "Write", icon: Feather },
                { id: "brainstorm" as NavTab, label: "Brainstorm", icon: Sparkles },
                { id: "lore" as NavTab, label: "Lore", icon: BookOpen },
                { id: "cores" as NavTab, label: "Cores", icon: Layers },
                { id: "studio" as NavTab, label: "Studio", icon: Command },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    tab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setComposerOpen(true)}
                className="hidden lg:flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-medium hover:bg-muted transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              <button
                onClick={() => setGalleryOpen(true)}
                aria-label="Character gallery"
                title="Character gallery"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
              >
                <Users className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              <ChaptersSheet
                books={books}
                onLoaded={() => setTab("chat")}
                trigger={
                  <button
                    aria-label="Chapters"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                  </button>
                }
              />
            </div>
          </header>

          {/* Body */}
          <main className="relative flex-1 overflow-hidden">
            {tab === "chat" && <ChatTab books={books} editorRef={editorRef} />}
            {tab === "brainstorm" && (
              <BrainstormTab
                books={books}
                editorRef={editorRef}
                onSwitchToChat={() => setTab("chat")}
                onOpenTab={(t) => setTab(t)}
              />
            )}
            {tab === "lore" && <LoreTab books={books} />}
            {tab === "cores" && <CoresTab books={books} />}
            {tab === "studio" && <StudioTab books={books} onOpenTab={setTab} />}
          </main>

          {/* BottomNav — mobile only */}
          <div className="lg:hidden">
            <BottomNav tab={tab} onChange={setTab} />
          </div>
          <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
          {galleryOpen && <CharacterGallery books={books} onClose={() => setGalleryOpen(false)} />}
          <ComposerModal
            isOpen={composerOpen}
            onClose={() => setComposerOpen(false)}
            onCreate={handleCreateBook}
          />
        </div>
      </div>
    );
  }

  // ============ LIBRARY VIEW ============
  return (
    <div className="flex h-[100dvh] bg-background text-foreground">
      {/* Sidebar */}
      <SidebarNav
        isOpen={sideOpen}
        onToggle={() => setSideOpen(!sideOpen)}
        books={books}
        onCreateBook={handleQuickCreate}
        onSelectBook={handleSelectBook}
        activeBookId={null}
        recentBooks={recentBooks}
        favorites={favorites}
      />

      {/* Main Library Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-5 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-3 py-3">
            {!sideOpen && (
              <button
                onClick={() => setSideOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                LoreWeave
              </span>
              <span className="text-sm font-semibold text-foreground">Your Library</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card hover:bg-muted text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setComposerOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> New Story
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {books.books.length === 0 ? (
            <EmptyLibraryState onCreate={() => setComposerOpen(true)} />
          ) : (
            <div className="mx-auto max-w-5xl px-5 py-6">
              {/* Composer: the entry point */}
              <div className="mx-auto max-w-2xl text-center mb-8">
                <h1 className="font-serif text-3xl font-semibold text-foreground">What are we building today?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe an idea, a character, a scene — LoreWeave opens a new book around it.
                </p>
                
                <div className="mt-6 rounded-3xl border border-border/80 bg-card p-3 shadow-sm transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/15 text-left">
                  <textarea
                    ref={composerRef}
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleComposerSubmit();
                      }
                    }}
                    rows={2}
                    placeholder="A city that moves before its people wake..."
                    className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="flex items-center justify-between px-2 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Enter to start · Shift+Enter for a new line
                    </span>
                    <button
                      onClick={handleComposerSubmit}
                      disabled={!composerValue.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {QUICK_STARTS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => handleQuickStart(q.seed)}
                      className="rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors shadow-sm"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Your books header divider */}
              <div className="mt-12 mb-6 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Your books
                </span>
                <div className="h-px flex-1 bg-border/70" />
                <button
                  onClick={handleBlankBook}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" /> blank book
                </button>
              </div>

              {/* Quick Actions Bar */}
              <QuickActionsBar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onSearch={setSearchQuery}
              />

              {/* Book Grid / List */}
              <div className="mt-4">
                {sortedBooks.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No stories match your search.
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedBooks.map((b) => (
                      <BookCard
                        key={b.id}
                        book={b}
                        onClick={() => handleSelectBook(b.id)}
                        isActive={false}
                        justCreated={justCreated === b.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedBooks.map((b) => (
                      <BookRow
                        key={b.id}
                        book={b}
                        onClick={() => handleSelectBook(b.id)}
                        isActive={false}
                        justCreated={justCreated === b.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreate={handleCreateBook}
      />
    </div>
  );
}

export default StoryCanvasApp;
