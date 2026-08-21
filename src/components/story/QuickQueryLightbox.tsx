import { useState, useRef, useEffect } from "react";
import { Zap, X, Loader2, ArrowUp } from "lucide-react";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

interface QQMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function QuickQueryLightbox({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<QQMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function ask() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const userMsg: QQMessage = { id: `qq${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const historyCtx = messages
        .slice(-6)
        .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
        .join("\n");

      const { content } = await invokeAssistant({
        data: {
          mode: "quick_query",
          action: text,
          context: historyCtx
            ? `PREVIOUS EXCHANGE (for context):\n${historyCtx}`
            : "(no prior context)",
        },
        signal: abort.signal,
      });

      const asstMsg: QQMessage = {
        id: `qq${Date.now()}a`,
        role: "assistant",
        content: content.trim(),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setBusy(false);
  }

  function adjustHeight() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Query"
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-3xl border border-border bg-card shadow-2xl animate-slide-up-fade overflow-hidden"
        style={{ maxHeight: "80dvh" }}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-tight">Quick Query</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Ask anything — drawing on general knowledge
            </p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition ml-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar"
          style={{ minHeight: messages.length === 0 ? "0px" : "120px" }}
        >
          {messages.length === 0 && !busy && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              <Zap className="mx-auto mb-2 h-5 w-5 text-amber-400/60" />
              Ask a quick question — writing tips, mythology, world-building facts, anything.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl px-3 py-2 text-[13px] leading-relaxed animate-slide-up-fade",
                m.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 bg-muted/60 text-foreground whitespace-pre-wrap"
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="mr-6 flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span className="text-[12px] text-muted-foreground font-mono">Thinking...</span>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-3 py-2.5">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                  if (inputRef.current) inputRef.current.style.height = "auto";
                }
              }}
              placeholder="Type your question... (Enter to send)"
              className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none resize-none no-scrollbar max-h-28 leading-normal"
              style={{ height: "auto" }}
              disabled={busy}
            />
            <button
              type="button"
              onClick={busy ? cancel : ask}
              disabled={!busy && !input.trim()}
              className={cn(
                "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                busy
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40"
              )}
              aria-label={busy ? "Cancel" : "Ask"}
            >
              {busy ? <X className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Shift+Enter for new line · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}

