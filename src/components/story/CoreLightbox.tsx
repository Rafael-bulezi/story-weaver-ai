import { useState } from "react";
import { X, Plus, Trash2, BookOpen } from "lucide-react";
import type { BooksApi, Core } from "@/lib/story-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { invokeAssistant } from "@/lib/ai.functions";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";

export function CoreLightbox({
  core,
  index,
  books,
  onClose,
}: {
  core: Core;
  index: number;
  books: BooksApi;
  onClose: () => void;
}) {
  const [addingTitle, setAddingTitle] = useState("");
  const [addingBody, setAddingBody] = useState("");

  async function sendBlockToLore(blockTitle: string, blockBody: string) {
    const text = `CORE: ${core.title}\nFACT: ${blockTitle} — ${blockBody}`;
    try {
      toastInfo("Extracting lore from this fact...");
      const { content } = await invokeAssistant({
        data: {
          mode: "extract",
          action: "Extract lore items (characters, places, concepts) from this core fact.",
          context: text,
        },
      });
      const n = books.importExtractedLore(content);
      if (n > 0) toastSuccess(`Extracted and added ${n} lore item${n === 1 ? "" : "s"}`);
      else toastInfo("No characters, places, or concepts found in this fact");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Extraction failed");
    }
  }

  return (
    <div className="animate-soft-fade-in fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/70 px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex min-w-0 items-center gap-2 py-3">
          <span className="flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--writer-bg)] px-2.5 text-[11px] font-semibold text-[color:var(--writer)]">
            <span className="font-serif">{core.emoji ?? "◇"}</span> Core {index + 1}
          </span>
          <input
            value={core.title}
            onChange={(e) => books.updateCore(core.id, { title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent font-serif text-lg font-semibold outline-none"
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {core.blocks.map((bl, bi) => (
            <div
              key={bl.id}
              className="rounded-2xl border border-l-2 border-border/70 border-l-[color:var(--writer)] bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {index + 1}.{bi + 1}
                </span>
                <input
                  value={bl.title}
                  onChange={(e) =>
                    books.updateCoreBlock(core.id, bl.id, { title: e.target.value })
                  }
                  placeholder="Fact name"
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none text-foreground"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => sendBlockToLore(bl.title, bl.body)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label="Extract Lore"
                    title="Extract lore"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => books.removeCoreBlock(core.id, bl.id)}
                    className="rounded-full p-1.5 text-destructive hover:bg-destructive/10"
                    aria-label="Delete fact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={bl.body}
                onChange={(e) =>
                  books.updateCoreBlock(core.id, bl.id, { body: e.target.value })
                }
                rows={3}
                placeholder="Detail…"
                className="mt-1.5 w-full resize-none bg-transparent text-[13px] leading-relaxed text-muted-foreground outline-none"
              />
            </div>
          ))}

          <div className="space-y-2 rounded-2xl border border-dashed border-border p-3 bg-card/50">
            <Input
              placeholder="New fact name"
              value={addingTitle}
              onChange={(e) => setAddingTitle(e.target.value)}
            />
            <Textarea
              rows={3}
              placeholder="Detail"
              value={addingBody}
              onChange={(e) => setAddingBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!addingTitle.trim()}
                onClick={() => {
                  books.addCoreBlock(core.id, {
                    title: addingTitle.trim(),
                    body: addingBody.trim(),
                  });
                  setAddingTitle("");
                  setAddingBody("");
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add fact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
