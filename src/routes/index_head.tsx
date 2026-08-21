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
  Layers,
  GitBranch,
  LayoutDashboard,
} from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { useBooks, useBranches, type Branch } from "@/lib/story-store";
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
  tab,
  onTabChange,
  onOpenSettings,
  branches,
  activeBranchId,
  onSwitchBranch,
  onForkBranch,
  onDeleteBranch,
}: {
  isOpen: boolean;
  onToggle: () => void;
  books: ReturnType<typeof useBooks>;
  onCreateBook: (mode?: ComposerMode) => void;
  onSelectBook: (id: string) => void;
  activeBookId: string | null;
  recentBooks: string[];
  favorites: string[];
  tab?: NavTab;
  onTabChange?: (t: NavTab) => void;
  onOpenSettings?: () => void;
  branches: Branch[];
  activeBranchId: string | undefined;
  onSwitchBranch: (id: string | undefined) => void;
  onForkBranch: (name: string) => void;
  onDeleteBranch: (id: string) => void;
}) {
  const [activeSection, setActiveSection] = useState<"library" | "recent" | "favorites" | "trash">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [trashedBooks, setTrashedBooks] = useState<Array<{ id: string; name: string; cover: string; deletedAt: number; snapshot: unknown }>>([]);
  const [forking, setForking] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  // Load trash from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sc:trash:v1");
      if (raw) setTrashedBooks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function saveTrashed(next: typeof trashedBooks) {
    setTrashedBooks(next);
    localStorage.setItem("sc:trash:v1", JSON.stringify(next));
  }

  function moveToTrash(bookId: string) {
    const book = books.books.find((b) => b.id === bookId);
    if (!book) return;
    const entry = { id: book.id, name: book.name, cover: book.cover ?? "◇", deletedAt: Date.now(), snapshot: book };
    saveTrashed([entry, ...trashedBooks]);
    books.deleteBook(bookId);
  }

  function restoreFromTrash(trashEntry: { id: string; name: string; cover: string; deletedAt: number; snapshot: unknown }) {
    books.createBook(trashEntry.snapshot as Parameters<typeof books.createBook>[0]);
    saveTrashed(trashedBooks.filter((t) => t.id !== trashEntry.id));
  }

  function permanentlyDelete(trashId: string) {
    saveTrashed(trashedBooks.filter((t) => t.id !== trashId));
  }

  const filteredBooks = books.books.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const recentItems = filteredBooks.filter((b) => recentBooks.includes(b.id));
  const favoriteItems = filteredBooks.filter((b) => favorites.includes(b.id));
  const bookBranches = branches.filter((b) => b.baseBookId === activeBookId);

  const navItems = [
    { id: "library" as const, label: "Library", icon: Library, count: books.books.length },
    { id: "recent" as const, label: "Recent", icon: Clock, count: recentBooks.length },
    { id: "favorites" as const, label: "Favorites", icon: Star, count: favorites.length },
  ];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card/50 backdrop-blur-xl transition-all duration-300 ease-out",
        isOpen ? "w-[280px]" : "w-[52px]",
        activeBranchId
          ? "border-amber-400/60"
          : "border-border/60"
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

      {/* ── COMPACT NEW + SEARCH ROW ── */}
      <div className={cn(
        "flex items-center gap-2 border-b border-border/40 px-2 py-2",
        !isOpen && "justify-center"
      )}>
        <button
          onClick={() => onCreateBook()}
          title="New Story"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
        {isOpen && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-full border border-border/60 bg-background pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
            />
          </div>
        )}
      </div>

      {/* ── NARRATIVE GIT: BRANCH TREE ── (only when a book is open) */}
      {activeBookId && isOpen && (
        <div className="border-b border-border/40 px-2 py-2 space-y-0.5">
          {/* Header row */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Timeline
            </span>
            <button
              onClick={() => { setForking(true); setNewBranchName(""); }}
              title="Fork new branch"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Main Canon */}
          <button
            onClick={() => onSwitchBranch(undefined)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors",
              !activeBranchId
                ? "bg-primary/15 text-primary font-semibold"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              !activeBranchId ? "bg-primary" : "bg-muted-foreground/50"
            )} />
            <span className="flex-1 text-left">Main Canon</span>
            {!activeBranchId && (
              <span className="text-[10px] font-mono text-primary/70">active</span>
            )}
          </button>

          {/* Branch rows */}
          {bookBranches.map((br) => (
            <div key={br.id} className="flex items-center gap-1">
              <span className="ml-2 text-muted-foreground/40 text-[10px] font-mono select-none">└</span>
              <button
                onClick={() => onSwitchBranch(br.id)}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors min-w-0",
                  activeBranchId === br.id
                    ? "bg-amber-500/10 border-l-2 border-amber-400 text-amber-700 dark:text-amber-400 font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <GitBranch className={cn(
                  "h-3 w-3 shrink-0",
                  activeBranchId === br.id ? "text-amber-500" : "text-muted-foreground"
                )} />
                <span className="flex-1 truncate text-left">{br.name}</span>
              </button>
              <button
                onClick={() => onDeleteBranch(br.id)}
                title="Discard branch"
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* In-place fork input */}
          {forking && (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBranchName.trim()) {
                    onForkBranch(newBranchName.trim());
                    setForking(false);
                    setNewBranchName("");
                  }
                  if (e.key === "Escape") { setForking(false); setNewBranchName(""); }
                }}
                placeholder="Branch name…"
                className="flex-1 rounded-lg border border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/30 px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-amber-400 text-foreground"
              />
              <button
                onClick={() => {
                  if (newBranchName.trim()) {
                    onForkBranch(newBranchName.trim());
                  }
                  setForking(false);
                  setNewBranchName("");
                }}
                className="rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Fork
              </button>
              <button
                onClick={() => { setForking(false); setNewBranchName(""); }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapsed branch indicator */}
      {activeBookId && !isOpen && activeBranchId && (
        <div className="flex justify-center py-1.5">
          <span title="You're in a branch" className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
      )}

      {/* ── LIBRARY NAVIGATION ── */}
      <nav className="flex-1 overflow-y-auto thin-scrollbar px-2 py-1">
        <div className={cn("mb-2", !isOpen && "flex flex-col items-center gap-1")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (item.id === "library") books.setActiveId(null);
              }}
              title={!isOpen ? item.label : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                activeSection === item.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground hover:bg-muted",
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

        {isOpen && <div className="my-2 border-t border-border/40" />}

        {/* Book List */}
        {isOpen && (
          <div className="space-y-0.5">
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {activeSection === "library" && "All Stories"}
              {activeSection === "recent" && "Recently Opened"}
              {activeSection === "favorites" && "Favorites"}
              {activeSection === "trash" && `Trash · ${trashedBooks.length}`}
            </div>

            {/* Trash section */}
            {activeSection === "trash" && (
              trashedBooks.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Trash is empty
                </div>
              ) : (
                trashedBooks.map((t) => (
                  <div key={t.id} className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground hover:bg-muted transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground font-semibold text-xs font-serif">
                      {t.cover}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-muted-foreground line-through">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Deleted {new Date(t.deletedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => restoreFromTrash(t)}
                        title="Restore"
                        className="rounded p-1 text-xs text-primary hover:bg-primary/10 font-semibold"
                      >
                        ↩
                      </button>
                      <button
                        onClick={() => { if (confirm(`Permanently delete "${t.name}"?`)) permanentlyDelete(t.id); }}
                        title="Delete forever"
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Normal book list */}
            {activeSection !== "trash" && (activeSection === "library" ? filteredBooks : activeSection === "recent" ? recentItems : favoriteItems).map((b) => (
              <div
                key={b.id}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  activeBookId === b.id
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
                onMouseEnter={() => setHoveredItem(b.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button className="flex min-w-0 flex-1 items-center gap-2.5" onClick={() => onSelectBook(b.id)}>
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-serif",
                    activeBookId === b.id ? "bg-primary/20 text-primary" : "bg-muted text-foreground font-semibold"
                  )}>
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
                      <div className="truncate text-[11px] text-muted-foreground">{b.title}</div>
                    )}
                  </div>
                </button>
                {hoveredItem === b.id && (
                  <button
                    onClick={() => { if (confirm(`Move "${b.name}" to Trash?`)) moveToTrash(b.id); }}
                    title="Move to Trash"
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── BOTTOM: TRASH SHORTCUT ── */}
      <div className={cn(
        "border-t border-border/40 p-2",
        !isOpen && "flex flex-col items-center gap-1"
      )}>
        <button
          onClick={() => setActiveSection("trash")}
          title={!isOpen ? "Trash" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted",
            activeSection === "trash" ? "bg-muted text-foreground font-medium" : "text-foreground",
            !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
          )}
        >
          <Trash2 className="h-4 w-4" />
          {isOpen && <span className="flex-1">Trash</span>}
          {isOpen && trashedBooks.length > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground">{trashedBooks.length}</span>
          )}
        </button>
      </div>

      {/* ── BOTTOM: TAB NAV + SETTINGS ── */}
      {onTabChange && (
        <div className={cn(
          "border-t border-border/60 p-2 space-y-0.5",
          !isOpen && "flex flex-col items-center gap-1"
        )}>
          {([
            { id: "chat" as NavTab, label: "Write", Icon: Feather, shortcut: "Z" },
            { id: "brainstorm" as NavTab, label: "Brainstorm", Icon: Sparkles, shortcut: "X" },
            { id: "lore" as NavTab, label: "Lore", Icon: BookOpen, shortcut: "C" },
            { id: "cores" as NavTab, label: "Cores", Icon: Layers, shortcut: "V" },
            { id: "studio" as NavTab, label: "Studio", Icon: LayoutDashboard, shortcut: "B" },
          ]).map(({ id, label, Icon, shortcut }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={!isOpen ? `${label} (Alt+${shortcut})` : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                tab === id
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-foreground hover:bg-muted",
                !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {isOpen && <span className="flex-1 text-[13px]">{label}</span>}
              {isOpen && (
                <kbd className="hidden rounded bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground group-hover:block">
                  ⌥{shortcut}
                </kbd>
              )}
            </button>
          ))}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title={!isOpen ? "Settings" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-muted",
                !isOpen && "h-8 w-8 justify-center p-0 mx-auto"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {isOpen && <span className="flex-1 text-[13px]">Settings</span>}
            </button>
          )}
        </div>
      )}
    </aside>
  );
