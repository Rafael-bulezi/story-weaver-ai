// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowUp,
  BookMarked,
  Settings,
  Users,
  PanelLeft,
} from "lucide-react";
import { useBooks, useBranches } from "@/lib/story-store";
import { type NavTab } from "@/components/story/BottomNav";
import { ChatTab } from "@/components/story/ChatTab";
import { BrainstormTab } from "@/components/story/BrainstormTab";
import { LoreTab } from "@/components/story/LoreTab";
import { CoresTab } from "@/components/story/CoresTab";
import { StudioTab } from "@/components/story/StudioTab";
import { ChaptersSheet } from "@/components/story/ChaptersSheet";
import { SettingsSheet } from "@/components/story/SettingsSheet";
import { CharacterGallery } from "@/components/story/CharacterGallery";
import { SidebarNav, type ComposerMode } from "@/components/story/SidebarNav";
import {
  ComposerModal,
  EmptyLibraryState,
  QuickActionsBar,
  BookCard,
  BookRow,
  type ViewMode,
  type SortBy,
} from "@/components/story/LibraryComponents";
import { getSavedSettings, applySettingsThemeAndAccent } from "@/lib/settings-store";

const QUICK_STARTS = [
  { label: "Continue a world", seed: "Let's continue building out the world of " },
  { label: "New character", seed: "Help me create a new character who " },
  { label: "Plot outline", seed: "Help me outline the plot for " },
];

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { title: "LoreWeave â€” AI storytelling workspace" },
      {
        name: "description",
        content:
          "Mobile-first AI storytelling workspace with living world cores, brainstorm chat, and canonical lore.",
      },
      { property: "og:title", content: "LoreWeave â€” Write worlds that remember themselves" },
      {
        property: "og:description",
        content: "AI storytelling workspace with world cores, brainstorm chat, and canonical lore.",
      },
    ],
  }),
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAIN APP
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StoryCanvasApp() {
  const books = useBooks();
  const active = books.active;
  const { branches, createBranch, deleteBranch } = useBranches();
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>();
  const [tab, setTab] = useState<NavTab>("chat");
  const [sideOpen, setSideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [loreHighlightId, setLoreHighlightId] = useState<string | undefined>();
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

  // Global keyboard shortcuts: Alt+Z,X,C,V,B for tabs, Cmd/Ctrl+N,S,B
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Tab switching via Alt + Z / X / C / V / B
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const isInputFocused =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA";
        
        if (!isInputFocused) {
          const key = e.key.toLowerCase();
          const tabMap: Record<string, NavTab> = {
            z: "chat",
            x: "brainstorm",
            c: "lore",
            v: "cores",
            b: "studio",
          };
          if (tabMap[key]) {
            e.preventDefault();
            setTab(tabMap[key]);
            return;
          }
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "n" || e.key === "N") {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        e.preventDefault();
        setComposerOpen(true);
      }
      if (e.key === "s" || e.key === "S") {
        if (document.activeElement?.tagName === "INPUT") return;
        e.preventDefault();
        if (books.active) books.saveChapter("draft");
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setSideOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [books, setSideOpen]);

  // Track recently opened books
  const handleSelectBook = useCallback((id: string) => {
    setRecentBooks((prev) => {
      const filtered = prev.filter((bid) => bid !== id);
      return [id, ...filtered].slice(0, 10);
    });
    books.setActiveId(id);
    setActiveBranchId(undefined);
  }, [books]);

  const handleQuickStart = useCallback((seed: string) => {
    setComposerValue(seed);
    composerRef.current?.focus();
  }, []);

  const handleComposerSubmit = useCallback(() => {
    const trimmed = composerValue.trim();
    if (!trimmed) return;
    const name = trimmed.length > 40 ? `${trimmed.slice(0, 40)}â€¦` : trimmed;
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
          tab={tab}
          onTabChange={setTab}
          onOpenSettings={() => setSettingsOpen(true)}
          branches={branches}
          activeBranchId={activeBranchId}
          onSwitchBranch={setActiveBranchId}
          onForkBranch={(name) => {
            const brId = createBranch(active.id, name);
            setActiveBranchId(brId);
          }}
          onDeleteBranch={(id) => {
            deleteBranch(id);
            if (activeBranchId === id) setActiveBranchId(undefined);
          }}
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
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {active.title || "Book"} {activeBranchId ? "Â· (Branch Timeline)" : ""}
                </span>
                <span className="truncate text-[13px] font-semibold text-foreground">{active.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setComposerOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              <button
                onClick={() => setGalleryOpen(true)}
                aria-label="Character gallery"
                title="Character gallery"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted text-foreground"
              >
                <Users className="h-3.5 w-3.5" />
              </button>
              <ChaptersSheet
                books={books}
                onLoaded={() => setTab("chat")}
                trigger={
                  <button
                    aria-label="Chapters"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted text-foreground"
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
                onOpenTab={(t, loreId) => {
                  setTab(t);
                  if (t === "lore" && loreId) setLoreHighlightId(loreId);
                }}
              />
            )}
            {tab === "lore" && <LoreTab books={books} highlightId={loreHighlightId} />}
            {tab === "cores" && <CoresTab books={books} />}
            {tab === "studio" && <StudioTab books={books} onOpenTab={setTab} />}
          </main>

          <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} books={books} />
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
        branches={branches}
        activeBranchId={activeBranchId}
        onSwitchBranch={setActiveBranchId}
        onForkBranch={(name) => {
          if (active) {
            const brId = createBranch(active.id, name);
            setActiveBranchId(brId);
          }
        }}
        onDeleteBranch={deleteBranch}
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
                  Describe an idea, a character, a scene â€” LoreWeave opens a new book around it.
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
                      Enter to start Â· Shift+Enter for a new line
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

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} books={books} />
      <ComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreate={handleCreateBook}
      />
    </div>
  );
}

export default StoryCanvasApp;
