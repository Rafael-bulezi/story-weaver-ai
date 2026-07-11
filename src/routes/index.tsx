import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Menu, Plus, Library, BookMarked } from "lucide-react";

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

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { title: "Story Canvas — AI storytelling workspace" },
      {
        name: "description",
        content:
          "Mobile-first AI storytelling workspace with living world cores, brainstorm chat, and canonical lore.",
      },
      { property: "og:title", content: "Story Canvas — Write worlds that remember themselves" },
      {
        property: "og:description",
        content: "AI storytelling workspace with world cores, brainstorm chat, and canonical lore.",
      },
    ],
  }),
});

function StoryCanvasApp() {
  const books = useBooks();
  const active = books.active;
  const [tab, setTab] = useState<NavTab>("chat");
  const [sideOpen, setSideOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // ============ LIBRARY VIEW ============
  if (!active) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-2 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Library className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Story Canvas
              </span>
              <span className="text-sm font-semibold">Your Library</span>
            </div>
          </div>
          <button
            onClick={() => {
              const id = books.createBook({ name: "Untitled Book" });
              books.setActiveId(id);
            }}
            className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold">Choose a book</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every book keeps its own lore, cores, and chapters.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {books.books.map((b) => (
                <button
                  key={b.id}
                  onClick={() => books.setActiveId(b.id)}
                  className="rounded-2xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] font-serif text-2xl text-[color:var(--writer)]">
                      {b.cover ?? "◇"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-lg font-semibold">{b.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{b.title}</div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    {b.content.trim().slice(0, 140) || "Empty draft — tap to begin."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{b.lore.length} lore</span>
                    <span>·</span>
                    <span>{b.cores.length} cores</span>
                    <span>·</span>
                    <span>{b.chapters.length} chapters</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============ BOOK VIEW ============
  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 py-3">
          <Sheet open={sideOpen} onOpenChange={setSideOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SideMenu books={books} onClose={() => setSideOpen(false)} />
          </Sheet>
          <div className="ml-1 flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Book
            </span>
            <span className="truncate text-sm font-semibold">{active.name}</span>
          </div>
        </div>
        <ChaptersSheet
          books={books}
          onLoaded={() => setTab("chat")}
          trigger={
            <button
              aria-label="Chapters"
              title="Chapters"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card hover:bg-muted"
            >
              <BookMarked className="h-4 w-4" />
            </button>
          }
        />
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
        {tab === "studio" && (
          <StudioTab
            books={books}
            onOpenChat={() => setTab("chat")}
            onOpenLore={() => setTab("lore")}
            onOpenCores={() => setTab("cores")}
          />
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
