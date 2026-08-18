import { useMemo, useState } from "react";
import { Check, BookmarkPlus, Save, Loader2 } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";

import type { BooksApi } from "@/lib/story-store";
import { buildBookContext } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export function ChatTab({
  books,
  editorRef,
}: {
  books: BooksApi;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const active = books.active!;
  const [busy, setBusy] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const wordCount = useMemo(
    () => (active.content.trim() ? active.content.trim().split(/\s+/).length : 0),
    [active.content],
  );

  async function extractLore() {
    setBusy("extract");
    try {
      const context = buildBookContext(active, { includeChapter: true });
      const { content } = await invokeAssistant({
        data: { mode: "extract", action: "Extract new lore from the current chapter.", context },
      });
      const n = books.importExtractedLore(content);
      if (n > 0) toastSuccess(`Added ${n} item${n === 1 ? "" : "s"} to lore`);
      else toastError("Nothing recognizable to extract");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(null);
    }
  }

  function saveChapter(type: "draft" | "canon") {
    books.saveChapter(type);
    setSaveOpen(false);
    toastSuccess(type === "canon" ? "Pushed to canon" : "Saved as draft");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-5 pt-4">
        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 mb-3 shrink-0">
          <input
            aria-label="Chapter title"
            value={active.title}
            onChange={(e) => books.updateBook(active.id, { title: e.target.value })}
            placeholder="Chapter title"
            className="min-w-0 flex-1 bg-transparent font-serif text-xl font-semibold outline-none"
          />
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground leading-none self-end pb-1">
            <span>{wordCount} words</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Check className="h-3 w-3 text-emerald-500" /> Autosaved
            </span>
          </div>
        </div>
        <textarea
          ref={editorRef}
          value={active.content}
          onChange={(e) => books.updateBook(active.id, { content: e.target.value })}
          placeholder="Begin your world…"
          className="prose-story no-scrollbar min-h-0 flex-1 resize-none bg-transparent outline-none"
          onClick={() => setToolbarOpen((v) => !v)}
        />

        {/* Subtle indicator — always visible when toolbar is hidden */}
        {!toolbarOpen && !busy && (
          <button
            type="button"
            aria-label="Show actions"
            onClick={() => setToolbarOpen(true)}
            className="mx-auto mb-2 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </button>
        )}

        {/* Action toolbar — slides in when open or when AI is busy */}
        <div
          className={cn(
            "grid grid-cols-2 gap-2 overflow-hidden transition-all duration-200 ease-in-out",
            toolbarOpen || !!busy
              ? "max-h-24 pb-3 opacity-100"
              : "max-h-0 pb-0 opacity-0 pointer-events-none",
          )}
        >
          <SecondaryPill
            icon={busy === "extract" ? Loader2 : BookmarkPlus}
            spin={busy === "extract"}
            label="Extract Lore"
            hint="Auto-add entities"
            disabled={!!busy || !active.content.trim()}
            onClick={extractLore}
          />
          <SecondaryPill
            icon={Save}
            label="Save Chapter"
            hint="Draft or Canon"
            disabled={!active.content.trim()}
            onClick={() => setSaveOpen(true)}
          />
        </div>
      </div>

      {saveOpen && (
        <SaveDialog
          onClose={() => setSaveOpen(false)}
          onDraft={() => saveChapter("draft")}
          onCanon={() => saveChapter("canon")}
        />
      )}
    </div>
  );
}

function SecondaryPill({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
  spin,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-2.5 text-left transition active:scale-[0.98]",
        disabled && "opacity-50",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
        <Icon className={cn("h-4 w-4", spin && "animate-spin")} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold">{label}</span>
        {hint && <span className="block truncate text-[10.5px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function SaveDialog({
  onClose,
  onDraft,
  onCanon,
}: {
  onClose: () => void;
  onDraft: () => void;
  onCanon: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl border-t border-border bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <h2 className="mb-1 text-[15px] font-semibold">Save Chapter As</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Choose how to file the current state.
        </p>
        <div className="space-y-2">
          <button
            onClick={onDraft}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left active:opacity-70"
          >
            <div className="text-[13px] font-semibold">Save to Drafts</div>
            <div className="text-[12px] text-muted-foreground">A working snapshot.</div>
          </button>
          <button
            onClick={onCanon}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left active:opacity-70"
          >
            <div className="text-[13px] font-semibold">Push to Canon</div>
            <div className="text-[12px] text-muted-foreground">The definitive version.</div>
          </button>
        </div>
      </div>
    </div>
  );
}
