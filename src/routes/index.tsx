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
  BookmarkPlus,
  Send,
  Loader2,
  ChevronLeft,
  MoreHorizontal,
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
  Files,
  Library,
  Pencil,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useBooks,
  loreToPrompt,
  type LoreItem,
  type LoreType,
  type Book,
} from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { property: "og:title", content: "Story Canvas — Write worlds that remember themselves" },
      {
        property: "og:description",
        content:
          "A pocket-sized AI storytelling workspace with living world memory, critic mode, and alternate-direction debate.",
      },
    ],
  }),
});

type Mode = "writer" | "critic" | "debater";
type TopTab = "write" | "files";

interface AssistantMessage {
  id: string;
  mode: Mode | "chat";
  label: string;
  content: string;
  createdAt: number;
}

const MODES: { id: Mode; label: string; sub: string; icon: typeof Feather; color: string }[] = [
  { id: "writer", label: "Writer", sub: "Expand & write", icon: Feather, color: "writer" },
  { id: "critic", label: "Critic", sub: "Find issues", icon: ScanSearch, color: "critic" },
  { id: "debater", label: "Debater", sub: "Challenge ideas", icon: Scale, color: "debater" },
];

const QUICK_ACTIONS: {
  label: string;
  hint: string;
  mode: Mode;
  action: string;
  icon: typeof Feather;
}[] = [
  {
    label: "Continue",
    hint: "Write next part",
    mode: "writer",
    action: "Continue the scene naturally from where it ends. Keep tone and pacing consistent.",
    icon: Feather,
  },
  {
    label: "Describe",
    hint: "Add sensory detail",
    mode: "writer",
    action:
      "Rewrite the last paragraph with more sensory detail — sight, sound, texture, temperature — without changing what happens.",
    icon: Sparkles,
  },
  {
    label: "Critic Check",
    hint: "Spot plot holes",
    mode: "critic",
    action:
      "Review the current scene for plot holes, unclear motivation, or continuity gaps against the world lore.",
    icon: ScanSearch,
  },
  {
    label: "Debate",
    hint: "Explore alternatives",
    mode: "debater",
    action: "Propose bold alternate directions the story could take from this exact point.",
    icon: Scale,
  },
  {
    label: "Extract Lore",
    hint: "Find new entities",
    mode: "writer",
    action:
      "Read the current scene and extract any new characters, places, or concepts worth adding to the world lore. Return as a compact bulleted list: TYPE — NAME — one-line description.",
    icon: BookmarkPlus,
  },
];

function StoryCanvasApp() {
  const books = useBooks();
  const active = books.active;

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>("write");
  const [askInput, setAskInput] = useState("");
  const invoke = useServerFn(invokeAssistant);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const wordCount = useMemo(
    () =>
      active && active.content.trim() ? active.content.trim().split(/\s+/).length : 0,
    [active],
  );

  async function run(
    mode: Mode | "chat",
    action: string,
    options?: { openPanel?: boolean; userPrompt?: string; busyKey?: string },
  ) {
    if (!active) return;
    const busyKey = options?.busyKey ?? `${mode}:${action.slice(0, 24)}`;
    setBusy(busyKey);
    if (options?.openPanel !== false) setAiOpen(true);
    try {
      const { content } = await invoke({
        data: {
          mode,
          action,
          story: active.content,
          lore: loreToPrompt(active.lore),
          userPrompt: options?.userPrompt ?? "",
        },
      });
      const label =
        mode === "chat" ? "Assistant" : (MODES.find((m) => m.id === mode)?.label ?? "Assistant");
      setMessages((prev) => [
        { id: `m${Date.now()}`, mode, label, content: content.trim(), createdAt: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
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
    setAiOpen(false);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  // ============ LIBRARY VIEW (no active book) ============
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
              Every book keeps its own lore, chapters, and history.
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

  // ============ BOOK VIEW (active book) ============
  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-1 py-3">
          <button
            onClick={() => books.setActiveId(null)}
            className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            aria-label="Back to library"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <Sheet open={sideOpen} onOpenChange={setSideOpen}>
            <SheetTrigger asChild>
              <button
                className="flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 hover:bg-muted"
                aria-label="Open book panel"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-[11px] font-semibold">World</span>
              </button>
            </SheetTrigger>
            <SidePanel books={books} onClose={() => setSideOpen(false)} />
          </Sheet>
          <div className="ml-1 flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {active.subtitle ?? "Book"}
            </span>
            <span className="truncate text-sm font-semibold">{active.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 py-3">
          <button
            onClick={() => setAiOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--writer-bg)] px-3 text-xs font-semibold text-[color:var(--writer)] active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="More"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Claude-style top tab pills */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-background px-4 py-2">
        <TabPill
          active={topTab === "write"}
          onClick={() => setTopTab("write")}
          icon={<Feather className="h-3.5 w-3.5" />}
          label="Write"
        />
        <TabPill
          active={topTab === "files"}
          onClick={() => setTopTab("files")}
          icon={<Files className="h-3.5 w-3.5" />}
          label={`Files · ${active.chapters.length}`}
        />
      </div>

      {/* Body */}
      <main className="flex-1 overflow-hidden">
        {topTab === "write" ? (
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
        ) : (
          <FilesView book={active} />
        )}
      </main>

      {/* Bottom actions — 2 columns including Save Chapter */}
      <div className="border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2 gap-2 px-3 py-3">
          <ActionPill
            label="Save Chapter"
            hint="Snapshot current draft"
            icon={Save}
            mode="writer"
            disabled={!!busy || !active.content.trim()}
            onClick={() => {
              books.saveChapter();
              toast.success("Chapter saved");
            }}
          />
          {QUICK_ACTIONS.map((a) => {
            const key = `qa:${a.label}`;
            return (
              <ActionPill
                key={a.label}
                label={a.label}
                hint={a.hint}
                icon={a.icon}
                mode={a.mode}
                busy={busy === key}
                disabled={!!busy}
                onClick={() => run(a.mode, a.action, { busyKey: key })}
              />
            );
          })}
        </div>
      </div>

      {/* AI sheet */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-3xl border-none p-0">
          <div className="flex h-full flex-col">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between px-5 pt-3">
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-[color:var(--writer)]" />
                  AI Assistant
                </SheetTitle>
              </SheetHeader>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 pt-4">
              {MODES.map((m) => {
                const Icon = m.icon;
                const key = `mode:${m.id}`;
                const isBusy = busy === key;
                return (
                  <button
                    key={m.id}
                    disabled={!!busy}
                    onClick={() => {
                      const qa = QUICK_ACTIONS.find((a) => a.mode === m.id);
                      run(m.id, qa?.action ?? "", { busyKey: key, openPanel: false });
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border border-border/70 p-3 text-left active:scale-[0.98]",
                      m.id === "writer" && "bg-[color:var(--writer-bg)]",
                      m.id === "critic" && "bg-[color:var(--critic-bg)]",
                      m.id === "debater" && "bg-[color:var(--debater-bg)]",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isBusy ? (
                        <Loader2
                          className={cn(
                            "h-3.5 w-3.5 animate-spin",
                            m.id === "writer" && "text-[color:var(--writer)]",
                            m.id === "critic" && "text-[color:var(--critic)]",
                            m.id === "debater" && "text-[color:var(--debater)]",
                          )}
                        />
                      ) : (
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            m.id === "writer" && "text-[color:var(--writer)]",
                            m.id === "critic" && "text-[color:var(--critic)]",
                            m.id === "debater" && "text-[color:var(--debater)]",
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          m.id === "writer" && "text-[color:var(--writer)]",
                          m.id === "critic" && "text-[color:var(--critic)]",
                          m.id === "debater" && "text-[color:var(--debater)]",
                        )}
                      >
                        {m.label}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground">{m.sub}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  Pick a mode above or a quick action to bring your assistants into the scene.
                </div>
              )}
              {messages.map((m) => (
                <AssistantCard
                  key={m.id}
                  message={m}
                  onInsert={() => insertIntoStory(m.content)}
                  onReplace={() => {
                    if (!active) return;
                    books.updateBook(active.id, {
                      content: active.content.replace(/\s*$/, "") + `\n\n${m.content.trim()}`,
                    });
                    toast.success("Appended to scene");
                    setAiOpen(false);
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
                  {busy === "chat" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ==================== Sub-components ====================

function TabPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
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

function BookCard({
  book,
  onOpen,
  onDelete,
}: {
  book: Book;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const preview = book.content.trim().slice(0, 140);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] font-serif text-2xl text-[color:var(--writer)]">
            {book.cover ?? "◇"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-lg font-semibold">{book.title}</div>
            {book.subtitle && (
              <div className="truncate text-[11px] text-muted-foreground">{book.subtitle}</div>
            )}
          </div>
        </div>
        <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {preview || "Empty draft — tap to begin."}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[10.5px] text-muted-foreground">
          <span>{book.lore.length} lore</span>
          <span>·</span>
          <span>{book.chapters.length} chapters</span>
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

function FilesView({ book }: { book: Book }) {
  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-5 py-5">
      <h2 className="font-serif text-xl font-semibold">Files</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Saved chapter snapshots and (soon) character/place images.
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Save className="h-3 w-3" /> Chapters
        </div>
        {book.chapters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No saved chapters yet.
            <br />
            Use <span className="font-semibold">Save Chapter</span> below to snapshot your draft.
          </div>
        ) : (
          <div className="space-y-2">
            {book.chapters.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border/70 bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {new Date(c.savedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  {c.content.slice(0, 220)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3 w-3" /> Images
        </div>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Character &amp; place images will live here.
        </div>
      </div>
    </div>
  );
}

function AssistantCard({
  message,
  onInsert,
  onReplace,
  onCopy,
}: {
  message: AssistantMessage;
  onInsert: () => void;
  onReplace: () => void;
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
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
        {message.content}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white"
          onClick={onInsert}
        >
          <ArrowRight className="mr-1 h-3 w-3" /> Insert
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white"
          onClick={onReplace}
        >
          <Replace className="mr-1 h-3 w-3" /> Append
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white"
          onClick={onCopy}
        >
          <Copy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </div>
    </div>
  );
}

// ==================== Side panel (books + lore) ====================

function SidePanel({
  books,
  onClose,
}: {
  books: ReturnType<typeof useBooks>;
  onClose: () => void;
}) {
  const [view, setView] = useState<"books" | "lore">(books.active ? "lore" : "books");
  const active = books.active;

  return (
    <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-border p-0">
      <div className="flex h-full flex-col">
        <SheetHeader className="border-b border-border/60 px-4 pb-3 pt-5 text-left">
          <div className="flex items-center justify-between gap-2">
            {view === "lore" && active ? (
              <button
                onClick={() => setView("books")}
                className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> All books
              </button>
            ) : (
              <SheetTitle className="flex items-center gap-2 text-base">
                <Library className="h-4 w-4" /> Library
              </SheetTitle>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {view === "lore" && active && (
            <SheetTitle className="mt-2 flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> {active.title}
            </SheetTitle>
          )}
        </SheetHeader>

        {view === "books" ? (
          <BooksList
            books={books}
            onOpenBook={(id) => {
              books.setActiveId(id);
              setView("lore");
            }}
          />
        ) : active ? (
          <LorePanel books={books} />
        ) : null}
      </div>
    </SheetContent>
  );
}

function BooksList({
  books,
  onOpenBook,
}: {
  books: ReturnType<typeof useBooks>;
  onOpenBook: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <button
        onClick={() => {
          const id = books.createBook({ title: "Untitled Book" });
          onOpenBook(id);
        }}
        className="mb-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-transparent p-3 text-left text-sm text-muted-foreground hover:bg-muted/40"
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
              onClick={() => onOpenBook(b.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
                isActive
                  ? "border-primary/40 bg-[color:var(--writer-bg)]"
                  : "border-border/70 bg-card hover:bg-muted/40",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-serif text-lg">
                {b.cover ?? "◇"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{b.title}</div>
                {b.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">{b.subtitle}</div>
                )}
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
    </div>
  );
}

function LorePanel({ books }: { books: ReturnType<typeof useBooks> }) {
  const active = books.active!;
  const [tab, setTab] = useState<LoreType>("character");
  const [adding, setAdding] = useState(false);
  const filtered = active.lore.filter((i) => i.type === tab);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as LoreType)}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="px-4 pt-3">
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted p-1">
          <TabsTrigger value="character" className="rounded-full text-xs">
            Characters
          </TabsTrigger>
          <TabsTrigger value="place" className="rounded-full text-xs">
            Places
          </TabsTrigger>
          <TabsTrigger value="concept" className="rounded-full text-xs">
            Concepts
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value={tab} className="mt-3 flex-1 overflow-y-auto px-4 pb-4">
        <button
          onClick={() => setAdding(true)}
          className="mb-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border p-2.5 text-left text-[12.5px] text-muted-foreground hover:bg-muted/40"
        >
          <Plus className="h-3.5 w-3.5" /> Add{" "}
          {tab === "character" ? "character" : tab === "place" ? "place" : "concept"}
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
              Nothing here yet.
            </div>
          )}
          {filtered.map((item) => (
            <LoreRow
              key={item.id}
              item={item}
              onSave={(patch) => {
                books.updateLore(item.id, patch);
                toast.success("Updated");
              }}
              onDelete={() => books.removeLore(item.id)}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
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
        placeholder={
          type === "character"
            ? "Role (e.g. Protagonist)"
            : type === "place"
              ? "Kind (e.g. City)"
              : "Category"
        }
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
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              role: role.trim() || undefined,
              description: description.trim(),
            })
          }
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
        onSave={(v) => {
          onSave(v);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name}</div>
            {item.role && <div className="text-[11px] text-muted-foreground">{item.role}</div>}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              onClick={() => setEditing(true)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {item.description && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
