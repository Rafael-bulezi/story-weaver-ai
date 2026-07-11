import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Trash2,
  X,
  Send,
  Loader2,
  Sparkles,
  Paperclip,
  Layers,
  Download,
  Search,
  BookOpen,
  Maximize2,
  Rows3,
  List,
} from "lucide-react";
import { CoreLightbox } from "@/components/story/CoreLightbox";

import type { BooksApi, Core } from "@/lib/story-store";
import { coresToPrompt } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toastSuccess, toastError } from "@/lib/toast";

export function CoresTab({ books }: { books: BooksApi }) {
  const active = books.active!;
  const invoke = useServerFn(invokeAssistant);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; sources: string } | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [namesOnly, setNamesOnly] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [attachTarget, setAttachTarget] = useState<string | null>(null);

  const filteredCores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active.cores;
    return active.cores.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.blocks.some(
          (b) => b.title.toLowerCase().includes(q) || b.body.toLowerCase().includes(q),
        ),
    );
  }, [active.cores, query]);

  async function ask() {
    const q = askInput.trim();
    if (!q) return;
    setAsking(true);
    try {
      const { content } = await invoke({
        data: {
          mode: "cores_ask",
          action: q,
          context: `WORLD CORES:\n${coresToPrompt(active.cores)}`,
        },
      });
      const lines = content.split(/\n+/);
      const srcIdx = lines.findIndex((l) => /^SOURCES:/i.test(l));
      const text = (srcIdx >= 0 ? lines.slice(0, srcIdx) : lines).join("\n").trim();
      const sources = srcIdx >= 0 ? lines[srcIdx].replace(/^SOURCES:\s*/i, "").trim() : "";
      setAnswer({ text, sources });
      setAskInput("");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Ask failed");
    } finally {
      setAsking(false);
    }
  }

  function pickFileFor(coreId: string) {
    setAttachTarget(coreId);
    fileRef.current?.click();
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !attachTarget) return;
    try {
      books.addCoreAttachment(attachTarget, f);
      toastSuccess(`Attached ${f.name}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Attach failed");
    }
    e.target.value = "";
    setAttachTarget(null);
  }

  async function sendCoreToLore(core: Core) {
    const facts = core.blocks
      .map((b) => `- ${b.title}: ${b.body}`)
      .join("\n");
    const text = `CORE: ${core.title}\n${facts}`;
    try {
      const { content } = await invoke({
        data: {
          mode: "extract",
          action: "Extract lore items (characters, places, concepts) from this core.",
          context: text,
        },
      });
      const n = books.importExtractedLore(content);
      if (n > 0) toastSuccess(`Added ${n} lore item${n === 1 ? "" : "s"}`);
      else toastError("No lore items found to add");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Extraction failed");
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4 pb-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-serif text-2xl font-semibold">Cores</h2>
              <p className="text-[12px] text-muted-foreground">
                Canonical facts the AI leans on when writing.
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setNamesOnly((v) => !v)}
                aria-label={namesOnly ? "Show full cores" : "Show names only"}
                title={namesOnly ? "Show full cores" : "Show names only"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                {namesOnly ? <Rows3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search cores"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="animate-slide-down-fade mb-3 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cores and facts…"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {answer && (
            <div className="animate-slide-up-fade mb-4 rounded-2xl border border-border/70 bg-[color:var(--writer-bg)] p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--writer)]">
                  <Sparkles className="h-3.5 w-3.5" /> Cores answer
                </div>
                <button
                  onClick={() => setAnswer(null)}
                  className="rounded-full p-1 hover:bg-white/60"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{answer.text}</p>
              {answer.sources && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Sources: Core {answer.sources}
                </div>
              )}
            </div>
          )}

          {active.cores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No cores yet. Use the <span className="font-medium">+</span> in the composer below.
            </div>
          )}
          {active.cores.length > 0 && filteredCores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              No cores match “{query}”.
            </div>
          )}
          <div className={namesOnly ? "space-y-1.5" : "space-y-3"}>
            {filteredCores.map((core) => {
              const realIndex = active.cores.indexOf(core);
              if (namesOnly) {
                return (
                  <button
                    key={core.id}
                    onClick={() => setLightboxId(core.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-left hover:border-primary/40"
                  >
                    <span className="flex h-5 items-center gap-1 rounded-full bg-[color:var(--writer-bg)] px-1.5 text-[10px] font-semibold text-[color:var(--writer)]">
                      <span className="font-serif">{core.emoji ?? "◇"}</span>
                      {realIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {core.title}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {core.blocks.length}
                    </span>
                  </button>
                );
              }
              return (
                <CoreCard
                  key={core.id}
                  core={core}
                  index={realIndex}
                  books={books}
                  onAttach={() => pickFileFor(core.id)}
                  onSendToLore={() => sendCoreToLore(core)}
                  onExpand={() => setLightboxId(core.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {lightboxId && (() => {
        const c = active.cores.find((x) => x.id === lightboxId);
        if (!c) return null;
        return (
          <CoreLightbox
            core={c}
            index={active.cores.indexOf(c)}
            books={books}
            onClose={() => setLightboxId(null)}
          />
        );
      })()}

      {/* Ask composer with inline + and @ */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="border-t border-border/60 bg-background px-3 py-2"
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-1.5">
          <button
            type="button"
            onClick={() => {
              const id = books.addCore({ title: "New Core", emoji: "◇" });
              if (id) toastSuccess("Core created");
            }}
            aria-label="New core"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder="Ask anything about your cores…"
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!askInput.trim() || asking}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Ask"
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function CoreCard({
  core,
  index,
  books,
  onAttach,
  onSendToLore,
  onExpand,
}: {
  core: Core;
  index: number;
  books: BooksApi;
  onAttach: () => void;
  onSendToLore: () => void;
  onExpand: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_CAP = 4;
  const visibleBlocks = showAll ? core.blocks : core.blocks.slice(0, VISIBLE_CAP);
  const hiddenCount = Math.max(0, core.blocks.length - visibleBlocks.length);
  return (
    <div className="animate-slide-up-fade rounded-2xl border border-border/70 bg-card p-3 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 items-center gap-1 rounded-full bg-[color:var(--writer-bg)] px-2 text-[10.5px] font-semibold text-[color:var(--writer)]">
            <span className="font-serif">{core.emoji ?? "◇"}</span> Core {index + 1}
          </span>
          <input
            value={core.title}
            onChange={(e) => books.updateCore(core.id, { title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onSendToLore}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Send to Lore"
            title="Extract lore from this core"
          >
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onAttach}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => books.removeCore(core.id)}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Delete core"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {(core.attachments?.length ?? 0) > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {core.attachments!.map((a) => (
            <div
              key={a.id}
              className="group flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px]"
            >
              <a
                href={a.dataUrl}
                download={a.name}
                className="flex items-center gap-1 hover:underline"
                title={a.name}
              >
                <Download className="h-2.5 w-2.5" />
                <span className="max-w-[140px] truncate">{a.name}</span>
              </a>
              <button
                onClick={() => books.removeCoreAttachment(core.id, a.id)}
                aria-label="Remove"
                className="ml-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {core.blocks.map((bl, bi) => (
          <div
            key={bl.id}
            className="rounded-xl border border-l-2 border-border/60 border-l-[color:var(--writer)] bg-background p-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {index + 1}.{bi + 1}
              </span>
              <input
                value={bl.title}
                onChange={(e) => books.updateCoreBlock(core.id, bl.id, { title: e.target.value })}
                placeholder="Fact name"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold outline-none"
              />
              <button
                onClick={() => books.removeCoreBlock(core.id, bl.id)}
                className="rounded-full p-1 hover:bg-muted"
                aria-label="Delete"
              >
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
            <Textarea
              rows={2}
              placeholder="Detail"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                  setBody("");
                }}
              >
                Cancel
              </Button>
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
