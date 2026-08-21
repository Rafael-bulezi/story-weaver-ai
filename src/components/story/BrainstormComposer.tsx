import { useRef, useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  ScanSearch,
  Scale,
  RefreshCw,
  Zap,
  MoreHorizontal,
  AtSign,
  Paperclip,
  Image,
  ArrowUp,
  X,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BooksApi } from "@/lib/story-store";
import { GoalPanel } from "@/components/story/GoalPanel";
import { AgentExecutionLog } from "@/components/story/AgentExecutionLog";
import type { HierarchicalStep } from "@/components/story/ActivityStream";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BrainstormComposer({
  input,
  setInput,
  busy,
  isFocused,
  setIsFocused,
  wideMode,
  includeChapter,
  setIncludeChapter,
  handleToggleWideMode,
  onSend,
  onCancel,
  onQuickQuery,
  composerInputRef,
  fileRef,
  imageRef,
  books,
  activities,
  logExpanded,
  onToggleExpandLog,
}: {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  busy: string | null;
  isFocused: boolean;
  setIsFocused: (f: boolean) => void;
  wideMode: boolean;
  includeChapter: boolean;
  setIncludeChapter: (c: boolean) => void;
  handleToggleWideMode: (val: boolean) => void;
  onSend: (mode: "chat" | "critic" | "debater" | "rewrite") => void;
  onCancel: () => void;
  onQuickQuery: () => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  imageRef: React.RefObject<HTMLInputElement | null>;
  books: BooksApi;
  activities?: HierarchicalStep[];
  logExpanded?: boolean;
  onToggleExpandLog?: () => void;
}) {
  const [goalPanelOpen, setGoalPanelOpen] = useState(false);

  const adjustTextareaHeight = useCallback(() => {
    const el = composerInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [composerInputRef]);

  const active = books.active;
  const goals = active?.goals ?? [];
  const suggestedCount = goals.filter((g) => g.status === "suggested" || (!g.status && g.source === "ai")).length;
  const activeCount = goals.filter((g) => (g.status === "active" || (!g.status && g.source !== "ai")) && !g.done).length;

  return (
    <div className="border-t border-border/60 bg-background px-3 py-2 shrink-0">
      <div className={cn("mx-auto w-full transition-all duration-300", wideMode ? "max-w-none" : "max-w-2xl")}>
        {/* Unified Composer Container with Fixed Agent Execution Log */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border bg-card transition-all duration-200 overflow-hidden shadow-sm",
            isFocused
              ? "border-primary/50 ring-1 ring-primary/30 shadow-[0_0_12px_rgba(var(--ring),0.2)]"
              : "border-border"
          )}
        >
          {/* ── Fixed Agent Execution Log docked to the composer top ── */}
          {activities && activities.length > 0 && (
            <AgentExecutionLog
              activities={activities}
              isBusy={!!busy}
              expanded={!!logExpanded}
              onToggleExpand={onToggleExpandLog || (() => {})}
            />
          )}

          {/* Form & Textarea Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend("chat");
            }}
            className="flex items-start gap-1.5 px-3 py-2"
          >
            {busy ? (
              <Loader2 className="ml-0.5 mt-1.5 h-4 w-4 shrink-0 text-primary animate-spin" />
            ) : (
              <Sparkles className="ml-0.5 mt-1.5 h-4 w-4 shrink-0 text-muted-foreground animate-pulse" />
            )}

            <textarea
              ref={composerInputRef}
              rows={1}
              value={input}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend("chat");
                  if (composerInputRef.current) {
                    composerInputRef.current.style.height = "auto";
                  }
                }
              }}
              placeholder="Ask anything... (@ to mention)"
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none resize-none no-scrollbar max-h-36 leading-normal placeholder:text-muted-foreground/60"
              style={{ height: "auto" }}
            />

            {/* ── Priority Persona Actions ── */}
            <div className="flex items-center gap-0.5 border-l border-border/60 pl-1.5 shrink-0 self-end mb-0.5">
              {/* Critic */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => onSend("critic")}
                title="Critic — surface plot holes"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--critic-bg)] hover:text-[color:var(--critic)]",
                  busy === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]"
                )}
              >
                <ScanSearch className={cn("h-4 w-4", busy === "critic" && "animate-spin")} />
              </button>
              {/* Debater */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => onSend("debater")}
                title="Debater — alternative directions"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--debater-bg)] hover:text-[color:var(--debater)]",
                  busy === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]"
                )}
              >
                <Scale className={cn("h-4 w-4", busy === "debater" && "animate-spin")} />
              </button>
              {/* Rewrite */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => onSend("rewrite")}
                title="Rewrite last reply"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--writer-bg)] hover:text-[color:var(--writer)]",
                  busy === "rewrite" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", busy === "rewrite" && "animate-spin")} />
              </button>
            </div>

            {/* ── Secondary Overflow Menu & Send Button ── */}
            <div className="flex items-center gap-1 border-l border-border/60 pl-1.5 shrink-0 self-end mb-0.5">
              {/* Overflow dropdown menu with Task Hub, Quick Query, Chapter toggle, Mentions, Attachments */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More options"
                    className="relative flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    {(suggestedCount > 0 || activeCount > 0) && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-violet-500" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>More Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Task Hub in Dropdown */}
                  <DropdownMenuItem
                    onClick={() => setGoalPanelOpen(true)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-500" />
                      <span>Task Hub</span>
                    </div>
                    {(suggestedCount > 0 || activeCount > 0) && (
                      <span className="rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-mono text-[10px] font-bold px-1.5 py-0.5">
                        {suggestedCount > 0 ? `${suggestedCount} new` : activeCount}
                      </span>
                    )}
                  </DropdownMenuItem>

                  {/* Quick Query in Dropdown */}
                  <DropdownMenuItem
                    onClick={onQuickQuery}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Quick Query</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuCheckboxItem
                    checked={includeChapter}
                    onCheckedChange={setIncludeChapter}
                  >
                    Include chapter text
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={wideMode}
                    onCheckedChange={handleToggleWideMode}
                  >
                    Wide view mode
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />

                  {/* @ Mention shortcut */}
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setInput((v) => (v.endsWith("@") ? v : v + (v && !v.endsWith(" ") ? " @" : "@")));
                      setTimeout(() => {
                        if (composerInputRef.current) {
                          composerInputRef.current.focus();
                          adjustTextareaHeight();
                        }
                      }, 20);
                    }}
                  >
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <span>Mention lore / core</span>
                  </DropdownMenuItem>

                  {/* Attach file */}
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span>Attach file</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">.txt .md .pdf</span>
                  </DropdownMenuItem>

                  {/* Attach image */}
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => imageRef.current?.click()}
                  >
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span>Attach image</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">PNG JPG</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send / Cancel button */}
              <button
                type={busy ? "button" : "submit"}
                onClick={busy ? onCancel : undefined}
                disabled={!busy && !input.trim()}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition",
                  busy
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground disabled:opacity-40"
                )}
                aria-label={busy ? "Cancel" : "Send"}
              >
                {busy ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Task Hub modal/sheet if opened from dropdown */}
      {goalPanelOpen && (
        <GoalPanelModal
          books={books}
          onClose={() => setGoalPanelOpen(false)}
        />
      )}
    </div>
  );
}

function GoalPanelModal({ books, onClose }: { books: BooksApi; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-soft-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-4 animate-slide-up-fade">
        <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            <span className="font-semibold text-sm">Task Hub & Goals</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="py-1">
          <GoalPanel books={books} defaultOpen={true} />
        </div>
      </div>
    </div>
  );
}

