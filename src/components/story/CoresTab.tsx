import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
} from "lucide-react";

import type { BooksApi, Core } from "@/lib/story-store";
import { coresToPrompt } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FloatingAddMenu } from "@/components/story/FloatingAddMenu";

export function CoresTab({ books }: { books: BooksApi }) {
  const active = books.active!;
  const invoke = useServerFn(invokeAssistant);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; sources: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [attachTarget, setAttachTarget] = useState<string | null>(null);

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
      toast.error(e instanceof Error ? e.message : "Ask failed");
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
      toast.success(`Attached ${f.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Attach failed");
    }
    e.target.value = "";
    setAttachTarget(null);
  }

  return (
    <div className="relative flex h-full flex-col">
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-1 font-serif text-2xl font-semibold">Cores</h2>
          <p className="mb-3 text-[12px] text-muted-foreground">
            Canonical facts the AI leans on when writing.
          </p>

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
              No cores yet. Tap the <span className="font-medium">+</span> above the nav.
            </div>
          )}
          <div className="space-y-3">
            {active.cores.map((core, i) => (
              <CoreCard
                key={core.id}
                core={core}
                index={i}
                books={books}
                onAttach={() => pickFileFor(core.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Ask composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="border-t border-border/60 bg-background px-3 py-2"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder="Ask anything about your cores…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
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

      <FloatingAddMenu
        open={addOpen}
        onOpenChange={setAddOpen}
        options={[
          {
            id: "core",
            label: "Add Core",
            icon: Plus,
            onClick: () => {
              const id = books.addCore({ title: "New Core", emoji: "◇" });
              if (id) toast.success("Core created");
            },
          },
          {
            id: "attach",
            label: "Attach File",
            icon: Paperclip,
            onClick: () => {
              const last = active.cores[active.cores.length - 1];
              if (!last) {
                toast.error("Create a core first, then attach.");
                return;
              }
              pickFileFor(last.id);
            },
          },
        ]}
      />
    </div>
  );
}

function CoreCard({
  core,
  index,
  books,
  onAttach,
}: {
  core: Core;
  index: number;
  books: BooksApi;
  onAttach: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
          <div key={bl.id} className="rounded-xl border border-border/60 border-l-2 border-l-[color:var(--writer)] bg-background p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono text-muted-foreground">
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
            <Input
              placeholder="Fact name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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
