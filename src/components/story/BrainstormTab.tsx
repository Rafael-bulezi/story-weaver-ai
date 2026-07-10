import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUp,
  Loader2,
  Sparkles,
  ScanSearch,
  Scale,
  RefreshCw,
  X,
  Copy,
  Replace,
  Wand2,
  ChevronDown,
  Feather,
  Plus,
  SlidersHorizontal,
  AtSign,
} from "lucide-react";

import type { BooksApi, BrainstormMessage, Core } from "@/lib/story-store";
import { buildSelectiveContext } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError, copyText } from "@/lib/toast";
import { ContextStrip, type ContextSelection } from "@/components/story/ContextStrip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BrainstormTab({
  books,
  editorRef,
  onSwitchToChat,
}: {
  books: BooksApi;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onSwitchToChat: () => void;
}) {
  const active = books.active!;
  const invoke = useServerFn(invokeAssistant);
  const [busy, setBusy] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [includeChapter, setIncludeChapter] = useState(false);
  const [ctx, setCtx] = useState<ContextSelection>({ coreIds: [], loreIds: [] });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active.brainstorm.length]);

  async function send(mode: "chat" | "critic" | "debater" | "rewrite", override?: string) {
    const text = (override ?? input).trim();
    if (!text && mode === "chat") return;
    setBusy(mode);
    if (mode === "chat" && !override) {
      books.addBrainstorm({ role: "user", content: text });
      setInput("");
    }
    try {
      const context = buildSelectiveContext(active, {
        overview: true,
        coreIds: ctx.coreIds,
        loreIds: ctx.loreIds,
        includeChapter,
        brainstormTail: 10,
      });
      let action = text;
      if (mode === "critic")
        action =
          "Review the recent brainstorm and current story context for plot holes, inconsistency vs cores/lore, or thin motivation.";
      else if (mode === "debater")
        action = "Propose 2–3 bold alternate directions from the recent brainstorm.";
      else if (mode === "rewrite") {
        const last = [...active.brainstorm].reverse();
        const asst = last.find((m) => m.role === "assistant");
        const user = last.find((m) => m.role === "user");
        if (!asst) {
          toastError("No assistant reply to rewrite yet.");
          setBusy(null);
          return;
        }
        action = `LAST USER MESSAGE:\n${user?.content ?? "(none)"}\n\nLAST ASSISTANT REPLY (rewrite this stronger):\n${asst.content}`;
      }
      const { content } = await invoke({ data: { mode, action, context } });
      books.addBrainstorm({
        role: "assistant",
        mode: mode === "rewrite" ? "chat" : mode,
        content: content.trim(),
      });
    } catch (e) {
      toastError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setBusy(null);
    }
  }

  function insertAtCursor(text: string) {
    const el = editorRef.current;
    const addition = `\n\n${text.trim()}`;
    const next = el
      ? active.content.slice(0, el.selectionStart ?? active.content.length) +
        addition +
        active.content.slice(el.selectionStart ?? active.content.length)
      : active.content + addition;
    books.updateBook(active.id, { content: next });
    toastSuccess("Appended to chapter");
    onSwitchToChat();
  }

  async function insertAsCore(text: string) {
    try {
      const { content: title } = await invoke({
        data: {
          mode: "categorize",
          action: "Categorize this brainstorm output into a short Core title.",
          context: `BRAINSTORM OUTPUT:\n${text}`,
        },
      });
      const coreTitle =
        (title || "New Core")
          .trim()
          .replace(/^["'`]|["'`]$/g, "")
          .slice(0, 60) || "New Core";
      const id = books.addCore({ title: coreTitle, emoji: "◇" });
      if (id) books.addCoreBlock(id, { title: "Note", body: text.trim() });
      toastSuccess(`Added as new Core: ${coreTitle}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't create core");
    }
  }

  const cores = active.cores;

  return (
    <div className="flex h-full flex-col">
      {/* Secondary action row */}
      <div className="grid grid-cols-3 gap-2 px-3 pb-1 pt-3">
        <SecondaryPill
          icon={busy === "critic" ? Loader2 : ScanSearch}
          spin={busy === "critic"}
          label="Critic"
          mode="critic"
          disabled={!!busy}
          onClick={() => send("critic")}
        />
        <SecondaryPill
          icon={busy === "debater" ? Loader2 : Scale}
          spin={busy === "debater"}
          label="Debater"
          mode="debater"
          disabled={!!busy}
          onClick={() => send("debater")}
        />
        <SecondaryPill
          icon={busy === "rewrite" ? Loader2 : RefreshCw}
          spin={busy === "rewrite"}
          label="Rewrite"
          mode="writer"
          disabled={!!busy}
          onClick={() => send("rewrite")}
        />
      </div>

      <ContextStrip book={active} value={ctx} onChange={setCtx} />

      {/* Chat scroll area */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {active.brainstorm.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            <Wand2 className="mx-auto mb-2 h-4 w-4" />
            Chat freely — I remember your cores, lore, and this thread.
          </div>
        )}
        {active.brainstorm.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} message={m} onDelete={() => books.removeBrainstorm(m.id)} />
          ) : (
            <AssistantBubble
              key={m.id}
              message={m}
              cores={cores}
              onDelete={() => books.removeBrainstorm(m.id)}
              onCopy={() =>
                copyText(m.content, "Reply copied")
              }
              onAppend={() => insertAtCursor(m.content)}
              onInsertCore={() => insertAsCore(m.content)}
              onSuggestFix={async () => {
                const { content } = await invoke({
                  data: {
                    mode: "suggest_fix",
                    action: "Suggest 3 fixes for this critic note.",
                    context: `CRITIC NOTE:\n${m.content}`,
                  },
                });
                books.addBrainstorm({
                  role: "assistant",
                  mode: "critic",
                  content: `FIX OPTIONS:\n${content.trim()}`,
                });
              }}
              onAddOptionToCore={(option, coreId, subcard) => {
                if (coreId === "__new__") {
                  const id = books.addCore({ title: option.slice(0, 40), emoji: "◇" });
                  if (id) books.addCoreBlock(id, { title: "Fix", body: option });
                  toastSuccess("Added as new Core");
                } else {
                  books.addCoreBlock(coreId, { title: subcard || "Fix", body: option });
                  toastSuccess("Added to Core");
                }
              }}
            />
          ),
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("chat");
        }}
        className="border-t border-border/60 bg-background px-3 py-2"
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-1.5">
          <Sparkles className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={includeChapter}
                onCheckedChange={setIncludeChapter}
              >
                Include chapter text
              </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => {
              setInput((v) => (v.endsWith("@") ? v : v + (v && !v.endsWith(" ") ? " @" : "@")));
              editorRef.current?.focus();
            }}
            aria-label="Mention lore or core"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <AtSign className="h-3.5 w-3.5" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || !!busy}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Send"
          >
            {busy === "chat" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecondaryPill({
  icon: Icon,
  label,
  mode,
  onClick,
  disabled,
  spin,
}: {
  icon: React.ElementType;
  label: string;
  mode: "critic" | "debater" | "writer";
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card px-2.5 py-1.5 text-left transition active:scale-[0.98]",
        disabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg",
          mode === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]",
          mode === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]",
          mode === "writer" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]",
        )}
      >
        <Icon className={cn("h-3 w-3", spin && "animate-spin")} />
      </span>
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  );
}

function UserBubble({ message, onDelete }: { message: BrainstormMessage; onDelete: () => void }) {
  return (
    <div className="group flex justify-end">
      <div className="animate-slide-up-fade relative max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">
        {message.content}
        <button
          onClick={onDelete}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow group-hover:flex"
          aria-label="Delete"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  cores,
  onDelete,
  onCopy,
  onAppend,
  onInsertCore,
  onSuggestFix,
  onAddOptionToCore,
}: {
  message: BrainstormMessage;
  cores: Core[];
  onDelete: () => void;
  onCopy: () => void;
  onAppend: () => void;
  onInsertCore: () => void;
  onSuggestFix: () => Promise<void>;
  onAddOptionToCore: (option: string, coreId: string, subcard?: string) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const tone =
    message.mode === "critic"
      ? {
          bg: "bg-[color:var(--critic-bg)]",
          text: "text-[color:var(--critic)]",
          Icon: ScanSearch,
          label: "Critic",
        }
      : message.mode === "debater"
        ? {
            bg: "bg-[color:var(--debater-bg)]",
            text: "text-[color:var(--debater)]",
            Icon: Scale,
            label: "Debater",
          }
        : {
            bg: "bg-transparent",
            text: "text-[color:var(--writer)]",
            Icon: Sparkles,
            label: "AI",
          };
  const Icon = tone.Icon;

  const isFixList = /^FIX OPTIONS:/i.test(message.content);
  const options = isFixList
    ? message.content
        .replace(/^FIX OPTIONS:\s*/i, "")
        .split(/\n+/)
        .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className={cn("group animate-slide-up-fade relative rounded-2xl p-3", tone.bg)}>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 hover:bg-background hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold", tone.text)}>
        <Icon className="h-3 w-3" /> {tone.label}
      </div>
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{message.content}</p>

      {isFixList && (
        <div className="mt-3 space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background p-2.5">
              <div className="text-[12.5px]">{opt}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => setOpenFor(openFor === `${i}` ? null : `${i}`)}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10.5px] font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add to core <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              {openFor === `${i}` && (
                <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-card p-2">
                  <button
                    onClick={() => {
                      onAddOptionToCore(opt, "__new__");
                      setOpenFor(null);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                  >
                    + Add as new Core
                  </button>
                  {cores.map((c, ci) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onAddOptionToCore(opt, c.id, `Fix ${(c.blocks.length ?? 0) + 1}`);
                        setOpenFor(null);
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                    >
                      Core {ci + 1}: {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <MiniBtn icon={Feather} label="Append" onClick={onAppend} />
        <MiniBtn icon={Plus} label="→ Core" onClick={onInsertCore} />
        <MiniBtn icon={Copy} label="Copy" onClick={onCopy} />
        {message.mode === "critic" && !isFixList && (
          <MiniBtn
            icon={suggesting ? Loader2 : Replace}
            spin={suggesting}
            label="Suggest Fix"
            onClick={async () => {
              setSuggesting(true);
              try {
                await onSuggestFix();
              } finally {
                setSuggesting(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function MiniBtn({
  icon: Icon,
  label,
  onClick,
  spin,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  spin?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-[11px] font-semibold hover:bg-muted/70"
    >
      <Icon className={cn("h-3 w-3", spin && "animate-spin")} /> {label}
    </button>
  );
}
