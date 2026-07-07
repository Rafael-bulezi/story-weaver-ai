import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Sparkles,
  Feather,
  ScanSearch,
  Scale,
  Plus,
  Send,
  Loader2,
  ChevronLeft,
  Wand2,
  ArrowRight,
  User,
  MapPin,
  Lightbulb,
  Trash2,
  Check,
  Copy,
  Replace,
  Save,
  Library,
  Menu,
  X,
  Crown,
  FileText,
  Layers,
  Download,
  MessageSquare,
  BookmarkPlus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useBooks,
  loreToPrompt,
  coresToPrompt,
  type LoreItem,
  type LoreType,
  type Book,
  type Chapter,
  type ChapterType,
  type Core,
} from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { title: "Story Canvas — AI storytelling workspace" },
      {
        name: "description",
        content:
          "Mobile-first AI storytelling workspace with living world memory, canon/draft chapters, and world cores.",
      },
      { property: "og:title", content: "Story Canvas — Write worlds that remember themselves" },
      {
        property: "og:description",
        content:
          "A pocket-sized AI storytelling workspace with living world memory, chapter canon, and world cores.",
      },
    ],
  }),
});

type Mode = "writer" | "critic" | "debater";
type MainTab = "write" | "world" | "chapter";

interface AssistantMessage {
  id: string;
  mode: Mode | "chat";
  label: string;
  content: string;
  createdAt: number;
}

const MODE_META: Record<Mode | "chat", { label: string; color: string; icon: typeof Feather }> = {
  writer: { label: "Writer", color: "writer", icon: Feather },
  critic: { label: "Critic", color: "critic", icon: ScanSearch },
  debater: { label: "Debater", color: "debater", icon: Scale },
  chat: { label: "Brainstorm", color: "writer", icon: Sparkles },
};

// ================================================================

function StoryCanvasApp() {
  const books = useBooks();
  const active = books.active;

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [coresOpen, setCoresOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [tab, setTab] = useState<MainTab>("write");
  const [askInput, setAskInput] = useState("");
  const invoke = useServerFn(invokeAssistant);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const wordCount = useMemo(
    () => (active && active.content.trim() ? active.content.trim().split(/\s+/).length : 0),
    [active],
  );

  async function run(
    mode: Mode | "chat",
    action: string,
    options?: { openAsk?: boolean; userPrompt?: string; busyKey?: string; onDone?: (text: string) => void },
  ) {
    if (!active) return;
    const busyKey = options?.busyKey ?? `${mode}:${action.slice(0, 20)}`;
    setBusy(busyKey);
    if (options?.openAsk !== false) setAskOpen(true);
    try {
      const combinedLore = [loreToPrompt(active.lore), coresToPrompt(active.cores)]
        .filter(Boolean)
        .join("\n\n---\n\n");
      const { content } = await invoke({
        data: {
          mode,
          action,
          story: active.content,
          lore: combinedLore,
          userPrompt: options?.userPrompt ?? "",
        },
      });
      const label = MODE_META[mode].label;
      const text = content.trim();
      setMessages((prev) => [
        { id: `m${Date.now()}`, mode, label, content: text, createdAt: Date.now() },
        ...prev,
      ]);
      options?.onDone?.(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function insertIntoStory(text: string) {
    if (!active) return;
    const el = editorRef.current;
    const addition = `\n\n${text.trim()}`;
    if (el) {
      const pos = el.selectionStart ?? active.content.length;
      const next = active.content.slice(0, pos) + addition + active.content.slice(pos);
      books.updateBook(active.id, { content: next });
    } else {
      books.updateBook(active.id, { content: active.content + addition });
    }
    toast.success("Inserted into scene");
    setAskOpen(false);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  function extractLore() {
    run(
      "writer",
      "Read the current scene and extract any new characters, places, or concepts worth adding to the world lore. Return ONLY a bulleted list, one per line, in this exact format:\nTYPE — NAME — one-line description\nWhere TYPE is one of: CHARACTER, PLACE, CONCEPT. No preamble.",
      {
        busyKey: "extract",
        openAsk: false,
        onDone: (text) => {
          const n = books.importExtractedLore(text);
          if (n > 0) toast.success(`Added ${n} item${n === 1 ? "" : "s"} to lore`);
          else toast.error("Nothing recognizable to extract");
        },
      },
    );
  }

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
              const id = books.createBook({ title: "Untitled Book" });
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
                <BookCard
                  key={b.id}
                  book={b}
                  onOpen={() => books.setActiveId(b.id)}
                  onDelete={() => {
                    if (confirm(`Delete "${b.title}"?`)) books.deleteBook(b.id);
                  }}
                />
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
        <div className="flex min-w-0 items-center gap-1.5 py-3">
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
              {active.subtitle ?? "Book"}
            </span>
            <span className="truncate text-sm font-semibold">{active.title}</span>
          </div>
        </div>
        {/* Top pills: Ask + Cores */}
        <div className="flex items-center gap-1.5 py-3">
          <button
            onClick={() => setAskOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--writer-bg)] px-3 text-xs font-semibold text-[color:var(--writer)] active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask
          </button>
          <button
            onClick={() => setCoresOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-xs font-semibold hover:bg-muted"
          >
            <Layers className="h-3.5 w-3.5" /> Cores
            {active.cores.length > 0 && (
              <span className="text-[10px] text-muted-foreground">· {active.cores.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-background px-3 py-2">
        <TabPill active={tab === "write"} onClick={() => setTab("write")} icon={<Feather className="h-3.5 w-3.5" />} label="Write" />
        <TabPill active={tab === "world"} onClick={() => setTab("world")} icon={<BookOpen className="h-3.5 w-3.5" />} label={`World · ${active.lore.length}`} />
        <TabPill active={tab === "chapter"} onClick={() => setTab("chapter")} icon={<FileText className="h-3.5 w-3.5" />} label={`Chapter · ${active.chapters.length}`} />
      </div>

      {/* Body */}
      <main className="flex-1 overflow-hidden">
        {tab === "write" && (
          <div className="mx-auto flex h-full max-w-2xl flex-col px-5 pt-4">
            <input
              aria-label="Chapter title"
              value={active.title}
              onChange={(e) => books.updateBook(active.id, { title: e.target.value })}
              className="mb-2 bg-transparent font-serif text-2xl font-semibold outline-none"
            />
            <textarea
              ref={editorRef}
              value={active.content}
              onChange={(e) => books.updateBook(active.id, { content: e.target.value })}
              placeholder="Begin your world…"
              className="prose-story min-h-0 flex-1 resize-none bg-transparent outline-none no-scrollbar"
            />
            <div className="flex items-center justify-between border-t border-border/60 py-2 text-[11px] text-muted-foreground">
              <span>{wordCount} words</span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Autosaved
              </span>
            </div>
          </div>
        )}
        {tab === "world" && <WorldView books={books} />}
        {tab === "chapter" && (
          <ChapterView
            book={active}
            onRestore={(c) => books.updateBook(active.id, { content: c.content, title: c.title })}
            onDelete={(c) =>
              books.updateBook(active.id, (b) => ({ chapters: b.chapters.filter((x) => x.id !== c.id) }))
            }
            onPromote={(c) =>
              books.updateBook(active.id, (b) => ({
                chapters: b.chapters.map((x) => (x.id === c.id ? { ...x, type: "canon" } : x)),
              }))
            }
          />
        )}
      </main>

      {/* Bottom action bar — 4 contextual pills per tab */}
      <div className="border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2 gap-2 px-3 py-3">
          {tab === "write" && (
            <>
              <ActionPill label="Brainstorm" hint="Chat with AI" icon={MessageSquare} mode="writer" onClick={() => setAskOpen(true)} />
              <ActionPill label="Lore" hint="Open world lore" icon={BookOpen} mode="writer" onClick={() => setTab("world")} />
              <ActionPill label="Extract Lore" hint="Auto-add entities" icon={BookmarkPlus} mode="writer" busy={busy === "extract"} disabled={!!busy || !active.content.trim()} onClick={extractLore} />
              <ActionPill label="Save Chapter" hint="Draft or Canon" icon={Save} mode="writer" disabled={!active.content.trim()} onClick={() => setSaveDialogOpen(true)} />
            </>
          )}
          {tab === "world" && (
            <>
              <ActionPill label="Brainstorm" hint="Chat with AI" icon={MessageSquare} mode="writer" onClick={() => setAskOpen(true)} />
              <ActionPill label="Extract Lore" hint="From current scene" icon={BookmarkPlus} mode="writer" busy={busy === "extract"} disabled={!!busy || !active.content.trim()} onClick={extractLore} />
              <ActionPill label="Critic" hint="Check world logic" icon={ScanSearch} mode="critic" disabled={!!busy} onClick={() => run("critic", "Review the world lore vs the current scene. Flag contradictions or gaps.", { busyKey: "critic" })} />
              <ActionPill label="Back to Write" hint="Return to editor" icon={Feather} mode="writer" onClick={() => setTab("write")} />
            </>
          )}
          {tab === "chapter" && (
            <>
              <ActionPill label="Brainstorm" hint="Chat with AI" icon={MessageSquare} mode="writer" onClick={() => setAskOpen(true)} />
              <ActionPill label="Lore" hint="Open world lore" icon={BookOpen} mode="writer" onClick={() => setTab("world")} />
              <ActionPill label="Save Draft" hint="Snapshot draft" icon={FileText} mode="writer" disabled={!active.content.trim()} onClick={() => { books.saveChapter("draft"); toast.success("Draft saved"); }} />
              <ActionPill label="Push to Canon" hint="Story truth" icon={Crown} mode="writer" disabled={!active.content.trim()} onClick={() => { books.saveChapter("canon"); toast.success("Pushed to canon"); }} />
            </>
          )}
        </div>
      </div>

      {/* Save chapter dialog */}
      {saveDialogOpen && (
        <SaveChapterDialog
          onDraft={() => {
            books.saveChapter("draft");
            setSaveDialogOpen(false);
            toast.success("Saved to drafts");
          }}
          onCanon={() => {
            books.saveChapter("canon");
            setSaveDialogOpen(false);
            toast.success("Pushed to canon");
          }}
          onClose={() => setSaveDialogOpen(false)}
        />
      )}

      {/* Cores sheet */}
      <Sheet open={coresOpen} onOpenChange={setCoresOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-md border-l border-border p-0">
          <CoresPanel books={books} onClose={() => setCoresOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Ask sheet (AI chat) */}
      <Sheet open={askOpen} onOpenChange={setAskOpen}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-3xl border-none p-0">
          <div className="flex h-full flex-col">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between px-5 pt-3">
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-[color:var(--writer)]" /> AI Assistant
                </SheetTitle>
              </SheetHeader>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 pt-4">
              {(["writer", "critic", "debater"] as const).map((m) => {
                const Icon = MODE_META[m].icon;
                const key = `mode:${m}`;
                const isBusy = busy === key;
                const defaults: Record<Mode, string> = {
                  writer: "Continue the scene naturally, keeping tone and pacing.",
                  critic: "Review the current scene for plot holes, unclear motivation, or continuity gaps against the world lore.",
                  debater: "Propose bold alternate directions the story could take from this exact point.",
                };
                return (
                  <button
                    key={m}
                    disabled={!!busy}
                    onClick={() => run(m, defaults[m], { busyKey: key, openAsk: false })}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border border-border/70 p-3 text-left active:scale-[0.98]",
                      m === "writer" && "bg-[color:var(--writer-bg)]",
                      m === "critic" && "bg-[color:var(--critic-bg)]",
                      m === "debater" && "bg-[color:var(--debater-bg)]",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isBusy ? (
                        <Loader2 className={cn("h-3.5 w-3.5 animate-spin", `text-[color:var(--${m})]`)} />
                      ) : (
                        <Icon className={cn("h-3.5 w-3.5", `text-[color:var(--${m})]`)} />
                      )}
                      <span className={cn("text-[13px] font-semibold", `text-[color:var(--${m})]`)}>
                        {MODE_META[m].label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Ask anything about your story, or pick a mode above.
                </div>
              )}
              {messages.map((m) => (
                <AssistantCard
                  key={m.id}
                  message={m}
                  onInsert={() => insertIntoStory(m.content)}
                  onAppend={() => {
                    books.updateBook(active.id, {
                      content: active.content.replace(/\s*$/, "") + `\n\n${m.content.trim()}`,
                    });
                    toast.success("Appended to scene");
                    setAskOpen(false);
                  }}
                  onCopy={() => copyText(m.content)}
                />
              ))}
            </div>
            <div className="border-t border-border bg-background px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = askInput.trim();
                  if (!q) return;
                  setAskInput("");
                  run("chat", q, { busyKey: "chat" });
                }}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="Ask anything about your story…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!askInput.trim() || !!busy}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  aria-label="Send"
                >
                  {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ==================== Small UI pieces ====================

function TabPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionPill({
  label,
  hint,
  icon: Icon,
  mode,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  hint: string;
  icon: typeof Feather;
  mode: Mode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-2.5 text-left shadow-[0_1px_0_rgba(20,20,30,0.02)] transition active:scale-[0.98]",
        disabled && !busy && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          mode === "writer" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]",
          mode === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]",
          mode === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]",
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[13px] font-semibold">{label}</span>
        <span className="truncate text-[10.5px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function BookCard({ book, onOpen, onDelete }: { book: Book; onOpen: () => void; onDelete: () => void }) {
  const preview = book.content.trim().slice(0, 140);
  const canonCount = book.chapters.filter((c) => c.type === "canon").length;
  const draftCount = book.chapters.filter((c) => c.type === "draft").length;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] font-serif text-2xl text-[color:var(--writer)]">
            {book.cover ?? "◇"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-lg font-semibold">{book.title}</div>
            {book.subtitle && <div className="truncate text-[11px] text-muted-foreground">{book.subtitle}</div>}
          </div>
        </div>
        <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {preview || "Empty draft — tap to begin."}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{book.lore.length} lore</span>
          {canonCount > 0 && (<><span>·</span><span className="font-semibold text-primary">{canonCount} canon</span></>)}
          {draftCount > 0 && (<><span>·</span><span className="font-semibold text-amber-600">{draftCount} {draftCount === 1 ? "draft" : "drafts"}</span></>)}
        </div>
      </button>
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 rounded-full p-1.5 opacity-0 transition hover:bg-muted group-hover:opacity-100"
        aria-label="Delete book"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ==================== World (lore) view ====================

function WorldView({ books }: { books: ReturnType<typeof useBooks> }) {
  const active = books.active!;
  const [tab, setTab] = useState<LoreType>("character");
  const [adding, setAdding] = useState(false);
  const filtered = active.lore.filter((i) => i.type === tab);
  const icons: Record<LoreType, typeof User> = { character: User, place: MapPin, concept: Lightbulb };
  const tabs: { id: LoreType; label: string }[] = [
    { id: "character", label: "Characters" },
    { id: "place", label: "Places" },
    { id: "concept", label: "Concepts" },
  ];

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2">
        {tabs.map(({ id, label }) => {
          const Icon = icons[id];
          const count = active.lore.filter((i) => i.type === id).length;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
                tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground active:opacity-70",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
              {count > 0 && (
                <span className={cn("ml-0.5 text-[11px]", tab === id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <button
          onClick={() => setAdding(true)}
          className="mb-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border p-2.5 text-left text-[12.5px] text-muted-foreground hover:bg-muted/40"
        >
          <Plus className="h-3.5 w-3.5" /> Add {tab === "character" ? "character" : tab === "place" ? "place" : "concept"}
        </button>
        {adding && (
          <LoreEditor
            type={tab}
            onCancel={() => setAdding(false)}
            onSave={(v) => {
              books.addLore({ type: tab, ...v });
              setAdding(false);
              toast.success("Added to world");
            }}
          />
        )}
        <div className="space-y-2">
          {filtered.length === 0 && !adding && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing here yet. Use <span className="font-medium">Extract Lore</span> to auto-fill from your scene.
            </div>
          )}
          {filtered.map((item) => (
            <LoreRow
              key={item.id}
              item={item}
              onSave={(patch) => { books.updateLore(item.id, patch); toast.success("Updated"); }}
              onDelete={() => books.removeLore(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoreEditor({
  type,
  initial,
  onSave,
  onCancel,
}: {
  type: LoreType;
  initial?: Partial<LoreItem>;
  onSave: (v: { name: string; role?: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <div className="mb-3 space-y-2 rounded-2xl border border-border bg-card p-3">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        placeholder={type === "character" ? "Role (e.g. Protagonist)" : type === "place" ? "Kind (e.g. City)" : "Category"}
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <Textarea
        rows={3}
        placeholder="Description — what should the AI always remember?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), role: role.trim() || undefined, description: description.trim() })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function LoreRow({
  item,
  onSave,
  onDelete,
}: {
  item: LoreItem;
  onSave: (patch: Partial<LoreItem>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const Icon = item.type === "character" ? User : item.type === "place" ? MapPin : Lightbulb;
  if (editing) {
    return (
      <LoreEditor
        type={item.type}
        initial={item}
        onCancel={() => setEditing(false)}
        onSave={(v) => { onSave(v); setEditing(false); }}
      />
    );
  }
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{item.name}</div>
              {item.role && <div className="truncate text-[11px] text-muted-foreground">{item.role}</div>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(true)} className="rounded-full p-1.5 hover:bg-muted" aria-label="Edit">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="rounded-full p-1.5 hover:bg-muted" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          {item.description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Chapter view (canon + drafts) ====================

function ChapterView({
  book,
  onRestore,
  onDelete,
  onPromote,
}: {
  book: Book;
  onRestore: (c: Chapter) => void;
  onDelete: (c: Chapter) => void;
  onPromote: (c: Chapter) => void;
}) {
  const canon = book.chapters.filter((c) => c.type === "canon");
  const drafts = book.chapters.filter((c) => c.type === "draft");
  return (
    <div className="h-full overflow-y-auto px-4 py-4 no-scrollbar">
      <div className="mx-auto max-w-2xl space-y-5">
        {book.chapters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[13px] text-muted-foreground">
            No chapters saved yet.
            <br />
            <span className="text-[12px]">Use <span className="font-medium">Save Chapter</span> on Write to create snapshots.</span>
          </div>
        )}
        {canon.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Crown className="h-3.5 w-3.5 text-primary" /> Canon · {canon.length}
            </div>
            <div className="space-y-2">
              {canon.map((c) => (
                <ChapterCard key={c.id} chapter={c} onRestore={() => onRestore(c)} onDelete={() => onDelete(c)} />
              ))}
            </div>
          </section>
        )}
        {drafts.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-amber-600" /> Drafts · {drafts.length}
            </div>
            <div className="space-y-2">
              {drafts.map((c) => (
                <ChapterCard
                  key={c.id}
                  chapter={c}
                  onRestore={() => onRestore(c)}
                  onDelete={() => onDelete(c)}
                  onPromote={() => onPromote(c)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ChapterCard({
  chapter,
  onRestore,
  onDelete,
  onPromote,
}: {
  chapter: Chapter;
  onRestore: () => void;
  onDelete: () => void;
  onPromote?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{chapter.title}</div>
          <div className="text-[10.5px] text-muted-foreground">{new Date(chapter.savedAt).toLocaleString()}</div>
        </div>
        <div className="flex gap-1">
          {onPromote && (
            <button onClick={onPromote} className="rounded-full p-1.5 hover:bg-muted" aria-label="Push to canon">
              <Crown className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
          <button onClick={onRestore} className="rounded-full p-1.5 hover:bg-muted" aria-label="Restore">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="rounded-full p-1.5 hover:bg-muted" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {chapter.content.slice(0, 220)}
      </p>
    </div>
  );
}

// ==================== Save-chapter dialog ====================

function SaveChapterDialog({
  onDraft,
  onCanon,
  onClose,
}: {
  onDraft: () => void;
  onCanon: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl border-t border-border bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Save Chapter As</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground active:opacity-70" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-muted-foreground">Choose how to file the current state of this chapter.</p>
        <div className="space-y-2">
          <button onClick={onDraft} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left active:opacity-70">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <FileText className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">Save to Drafts</span>
              <span className="mt-0.5 block text-[12px] text-muted-foreground">A working snapshot — still being shaped.</span>
            </span>
          </button>
          <button onClick={onCanon} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left active:opacity-70">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">Push to Canon</span>
              <span className="mt-0.5 block text-[12px] text-muted-foreground">The definitive version. Story truth.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Cores panel ====================

function CoresPanel({ books, onClose }: { books: ReturnType<typeof useBooks>; onClose: () => void }) {
  const active = books.active!;
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function createCore() {
    const t = newTitle.trim();
    if (!t) return;
    books.addCore({ title: t, emoji: "◇" });
    setNewTitle("");
    setShowAdd(false);
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 pb-3 pt-5 text-left">
        <SheetTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" /> World Cores
        </SheetTitle>
        <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">Named world facts the AI draws on when writing.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground active:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        {showAdd && (
          <div className="mb-3 space-y-3 rounded-2xl border border-border bg-card p-4">
            <Input
              autoFocus
              placeholder="Core title — e.g. State of Technology"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCore()}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewTitle(""); }}>Cancel</Button>
              <Button size="sm" disabled={!newTitle.trim()} onClick={createCore}>Create</Button>
            </div>
          </div>
        )}
        {active.cores.length === 0 && !showAdd && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            No cores yet. Add a world fact like "State of Technology" or "The Fracture Event".
          </div>
        )}
        <div className="space-y-3">
          {active.cores.map((core) => (
            <CoreCard key={core.id} core={core} books={books} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CoreCard({ core, books }: { core: Core; books: ReturnType<typeof useBooks> }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-serif text-lg">{core.emoji ?? "◇"}</span>
          <input
            value={core.title}
            onChange={(e) => books.updateCore(core.id, { title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        </div>
        <button onClick={() => books.removeCore(core.id)} className="rounded-full p-1.5 hover:bg-muted" aria-label="Delete core">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1.5">
        {core.blocks.map((bl) => (
          <div key={bl.id} className="rounded-xl border border-border/60 bg-background p-2.5">
            <div className="flex items-center gap-2">
              <input
                value={bl.title}
                onChange={(e) => books.updateCoreBlock(core.id, bl.id, { title: e.target.value })}
                placeholder="Fact name"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold outline-none"
              />
              <button onClick={() => books.removeCoreBlock(core.id, bl.id)} className="rounded-full p-1 hover:bg-muted" aria-label="Delete">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <textarea
              value={bl.body}
              onChange={(e) => books.updateCoreBlock(core.id, bl.id, { body: e.target.value })}
              rows={2}
              placeholder="Detail…"
              className="mt-1 w-full resize-none bg-transparent text-[12px] leading-relaxed text-muted-foreground outline-none"
            />
          </div>
        ))}
        {adding ? (
          <div className="space-y-2 rounded-xl border border-border bg-background p-2.5">
            <Input placeholder="Fact name" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea rows={2} placeholder="Detail" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); setBody(""); }}>Cancel</Button>
              <Button
                size="sm"
                disabled={!title.trim()}
                onClick={() => {
                  books.addCoreBlock(core.id, { title: title.trim(), body: body.trim() });
                  setAdding(false);
                  setTitle("");
                  setBody("");
                }}
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border p-2 text-left text-[12px] text-muted-foreground hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" /> Add fact
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== Side menu (books + settings) ====================

function SideMenu({ books, onClose }: { books: ReturnType<typeof useBooks>; onClose: () => void }) {
  function exportData() {
    const data = typeof window !== "undefined" ? localStorage.getItem("sc:books:v3") : null;
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function clearAll() {
    if (confirm("Delete all books, lore, and chapters? This cannot be undone.")) {
      localStorage.removeItem("sc:books:v3");
      localStorage.removeItem("sc:active-book");
      window.location.reload();
    }
  }
  return (
    <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-border p-0">
      <div className="flex h-full flex-col">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 pb-3 pt-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Library className="h-4 w-4" /> Your Books
          </SheetTitle>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => {
              const id = books.createBook({ title: "Untitled Book" });
              books.setActiveId(id);
              onClose();
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-transparent p-3 text-left text-sm text-muted-foreground hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </div>
            New book
          </button>
          <div className="space-y-1.5">
            {books.books.map((b) => {
              const isActive = books.activeId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => { books.setActiveId(b.id); onClose(); }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
                    isActive ? "border-primary/40 bg-[color:var(--writer-bg)]" : "border-border/70 bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-serif text-lg">
                    {b.cover ?? "◇"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{b.title}</div>
                    {b.subtitle && <div className="truncate text-[11px] text-muted-foreground">{b.subtitle}</div>}
                    <div className="mt-1 flex gap-2 text-[10.5px] text-muted-foreground">
                      <span>{b.lore.length} lore</span>
                      <span>·</span>
                      <span>{b.chapters.length} chapters</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => books.setActiveId(null)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card p-2.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Library
          </button>
        </div>
        <div className="border-t border-border/60 p-3 space-y-1.5">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Settings</div>
          <button onClick={exportData} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-muted">
            <Download className="h-4 w-4 text-muted-foreground" /> Export data
          </button>
          <button onClick={clearAll} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Clear all data
          </button>
        </div>
      </div>
    </SheetContent>
  );
}

// ==================== Assistant card ====================

function AssistantCard({
  message,
  onInsert,
  onAppend,
  onCopy,
}: {
  message: AssistantMessage;
  onInsert: () => void;
  onAppend: () => void;
  onCopy: () => void;
}) {
  const tone =
    message.mode === "critic"
      ? { bg: "bg-[color:var(--critic-bg)]", text: "text-[color:var(--critic)]", icon: ScanSearch }
      : message.mode === "debater"
        ? { bg: "bg-[color:var(--debater-bg)]", text: "text-[color:var(--debater)]", icon: Scale }
        : { bg: "bg-[color:var(--writer-bg)]", text: "text-[color:var(--writer)]", icon: Feather };
  const Icon = tone.icon;
  return (
    <div className={cn("rounded-2xl p-4", tone.bg)}>
      <div className={cn("mb-2 flex items-center gap-1.5 text-xs font-semibold", tone.text)}>
        <Icon className="h-3.5 w-3.5" />
        {message.label}
      </div>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{message.content}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onInsert}>
          <ArrowRight className="mr-1 h-3 w-3" /> Insert
        </Button>
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onAppend}>
          <Replace className="mr-1 h-3 w-3" /> Append
        </Button>
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onCopy}>
          <Copy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </div>
    </div>
  );
}
