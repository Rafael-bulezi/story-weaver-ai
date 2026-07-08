import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Send, Loader2, Sparkles, ScanSearch, Scale, X, Copy, Replace, Wand2, ChevronDown, Feather, Plus,
} from "lucide-react";

import type { BooksApi, BrainstormMessage, Core } from "@/lib/story-store";
import { buildBookContext } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active.brainstorm.length]);

  async function send(mode: "chat" | "critic" | "debater", override?: string) {
    const text = (override ?? input).trim();
    if (!text && mode === "chat") return;
    setBusy(mode);
    if (mode === "chat" && !override) {
      books.addBrainstorm({ role: "user", content: text });
      setInput("");
    }
    try {
      const context = buildBookContext(active, { includeChapter, brainstormTail: 8 });
      const action =
        mode === "chat"
          ? text
          : mode === "critic"
            ? "Review the recent brainstorm and current story context for plot holes, inconsistency vs cores/lore, or thin motivation."
            : "Propose 2–3 bold alternate directions from the recent brainstorm and story context.";
      const { content } = await invoke({ data: { mode, action, context } });
      books.addBrainstorm({ role: "assistant", mode, content: content.trim() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
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
    toast.success("Appended to chapter");
    onSwitchToChat();
  }

  async function insertAsCore(text: string) {
    // Ask AI to categorize into a short core title
    try {
      const { content: title } = await invoke({
        data: {
          mode: "categorize",
          action: "Categorize the following brainstorm output into a short Core title.",
          context: `BRAINSTORM OUTPUT:\n${text}`,
        },
      });
      const coreTitle = (title || "New Core").trim().replace(/^["'`]|["'`]$/g, "").slice(0, 60) || "New Core";
      const id = books.addCore({ title: `${coreTitle}`, emoji: "◇" });
      if (id) {
        books.addCoreBlock(id, { title: "Note", body: text.trim() });
      }
      toast.success(`Added as new Core: ${coreTitle}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create core");
    }
  }

  const cores = active.cores;

  return (
    <div className="flex h-full flex-col">
      {/* Secondary action row */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-2 pt-3">
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
      </div>
      <label className="mx-3 mb-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <input
          type="checkbox"
          checked={includeChapter}
          onChange={(e) => setIncludeChapter(e.target.checked)}
          className="h-3 w-3"
        />
        Include full chapter text in context
      </label>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {active.brainstorm.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            <Wand2 className="mx-auto mb-2 h-4 w-4" />
            Brainstorm with the AI. It sees your cores, lore, and recent chat — but not your chapter unless you tick above.
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
              onCopy={() => navigator.clipboard.writeText(m.content).then(() => toast.success("Copied"))}
              onAppend={() => insertAtCursor(m.content)}
              onInsertCore={() => insertAsCore(m.content)}
              onSuggestFix={async () => {
                const { content } = await invoke({
                  data: { mode: "suggest_fix", action: "Suggest 3 fixes for this critic note.", context: `CRITIC NOTE:\n${m.content}` },
                });
                books.addBrainstorm({ role: "assistant", mode: "critic", content: `FIX OPTIONS:\n${content.trim()}` });
              }}
              onAddOptionToCore={(option, coreId, subcard) => {
                if (coreId === "__new__") {
                  const id = books.addCore({ title: option.slice(0, 40), emoji: "◇" });
                  if (id) books.addCoreBlock(id, { title: "Fix", body: option });
                  toast.success("Added as new Core");
                } else {
                  books.addCoreBlock(coreId, { title: subcard || "Fix", body: option });
                  toast.success("Added to Core");
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
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Brainstorm anything with your AI…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || !!busy}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Send"
          >
            {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
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
  mode: "critic" | "debater";
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-2 text-left transition active:scale-[0.98]",
        disabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-xl",
          mode === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]",
          mode === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]",
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
      </span>
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}

function UserBubble({ message, onDelete }: { message: BrainstormMessage; onDelete: () => void }) {
  return (
    <div className="group flex justify-end">
      <div className="relative max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">
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
      ? { bg: "bg-[color:var(--critic-bg)]", text: "text-[color:var(--critic)]", Icon: ScanSearch, label: "Critic" }
      : message.mode === "debater"
        ? { bg: "bg-[color:var(--debater-bg)]", text: "text-[color:var(--debater)]", Icon: Scale, label: "Debater" }
        : { bg: "bg-[color:var(--writer-bg)]", text: "text-[color:var(--writer)]", Icon: Sparkles, label: "Brainstorm" };
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
    <div className={cn("group relative rounded-2xl p-3.5", tone.bg)}>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-muted-foreground opacity-0 transition group-hover:opacity-100 md:opacity-70"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className={cn("mb-2 flex items-center gap-1.5 text-xs font-semibold", tone.text)}>
        <Icon className="h-3.5 w-3.5" /> {tone.label}
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
                    onClick={() => { onAddOptionToCore(opt, "__new__"); setOpenFor(null); }}
                    className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                  >
                    + Add as new Core
                  </button>
                  {cores.map((c, ci) => (
                    <button
                      key={c.id}
                      onClick={() => { onAddOptionToCore(opt, c.id, `Fix ${(c.blocks.length ?? 0) + 1}`); setOpenFor(null); }}
                      className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                    >
                      Core {ci + 1}: {c.title}
                    </button>
                  ))}
                  {cores.length === 0 && (
                    <div className="px-2 py-1 text-[11px] text-muted-foreground">No cores yet — use "new Core".</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <MiniBtn icon={Feather} label="Append" onClick={onAppend} />
        <MiniBtn icon={Plus} label="Insert → Core" onClick={onInsertCore} />
        <MiniBtn icon={Copy} label="Copy" onClick={onCopy} />
        {message.mode === "critic" && !isFixList && (
          <MiniBtn
            icon={suggesting ? Loader2 : Replace}
            spin={suggesting}
            label="Suggest Fix"
            onClick={async () => {
              setSuggesting(true);
              try { await onSuggestFix(); } finally { setSuggesting(false); }
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
      className="flex h-7 items-center gap-1 rounded-full bg-white/70 px-2.5 text-[11px] font-semibold hover:bg-white"
    >
      <Icon className={cn("h-3 w-3", spin && "animate-spin")} /> {label}
    </button>
  );
}
