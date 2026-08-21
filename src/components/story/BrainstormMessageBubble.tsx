import { useState, useEffect } from "react";
import {
  Sparkles,
  ScanSearch,
  Scale,
  RefreshCw,
  X,
  Copy,
  Replace,
  GitBranch,
  Database,
  Loader2,
} from "lucide-react";
import type { BrainstormMessage, Core, LoreItem } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import { ChunkedCardsRenderer } from "@/components/story/WorthKeeping";
import {
  HierarchicalStepStream,
  ActivityRow,
  type ActivityStep,
  type HierarchicalStep,
} from "@/components/story/ActivityStream";

const _STORAGE_KEY = "sc:streamed-msg-ids";

function _loadStreamedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function _saveStreamedId(id: string) {
  try {
    const ids = _loadStreamedIds();
    ids.add(id);
    const arr = [...ids].slice(-500);
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

const _streamedMessageIds = _loadStreamedIds();

export function UserBubble({ message, onDelete }: { message: BrainstormMessage; onDelete: () => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="group flex justify-end">
      <div className="animate-slide-up-fade relative max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">You</span>
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? "Expand message" : "Collapse to 2 lines"}
            className="text-[9px] font-mono opacity-70 hover:opacity-100 transition"
          >
            {isCollapsed ? "▼ expand" : "▲ collapse"}
          </button>
        </div>
        {isCollapsed ? (
          <div 
            onClick={() => setIsCollapsed(false)}
            className="cursor-pointer italic opacity-85 line-clamp-2 leading-relaxed"
          >
            {message.content}
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}
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

export function AssistantBubble({
  message,
  cores,
  loreItems = [],
  completedActivities = [],
  onDelete,
  onCopy,
  onAppend,
  onInsertCore,
  onSuggestFix,
  onAddOptionToCore,
  onBranch,
  showPromotionNudge = false,
  onPromoteToLore,
  onPromoteToCore,
  onOpenTab,
  onSelectRecommendation,
}: {
  message: BrainstormMessage;
  cores: Core[];
  loreItems?: LoreItem[];
  completedActivities?: ActivityStep[];
  onDelete: () => void;
  onCopy: () => void;
  onAppend: () => void;
  onInsertCore: () => void;
  onSuggestFix: () => Promise<void>;
  onAddOptionToCore: (option: string, coreId: string, subcard?: string) => void;
  onBranch?: () => void;
  showPromotionNudge?: boolean;
  onPromoteToLore?: () => void;
  onPromoteToCore?: () => void;
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
  onSelectRecommendation?: (text: string) => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [showUsedCtx, setShowUsedCtx] = useState(false);

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
  const alreadyStreamed = _streamedMessageIds.has(message.id);
  const [displayedContent, setDisplayedContent] = useState(
    alreadyStreamed ? message.content : ""
  );

  useEffect(() => {
    if (_streamedMessageIds.has(message.id)) {
      setDisplayedContent(message.content);
      return;
    }
    const words = message.content.split(/\s+/);
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedContent((prev: string) => (prev ? prev + " " : "") + words[index]);
      index++;
      if (index >= words.length) {
        clearInterval(interval);
        _streamedMessageIds.add(message.id);
        _saveStreamedId(message.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [message.id, message.content]);

  const isFixList = /^FIX OPTIONS:/i.test(message.content);
  const options = isFixList
    ? message.content
        .replace(/^FIX OPTIONS:\s*/i, "")
        .split(/\n+/)
        .map((l: string) => l.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className={cn("group animate-slide-up-fade relative rounded-2xl p-3 border border-border/40", tone.bg)}>
      {/* Header row: icon/label · used-context · collapse · delete */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold", tone.text)}>
          <Icon className="h-3.5 w-3.5" /> {tone.label}
        </div>
        <div className="flex items-center gap-1">
          {/* Inline Used Context pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUsedCtx((v) => !v)}
              className="flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Show used context"
            >
              <Database className="h-3 w-3" />
              <span>ctx</span>
            </button>
            {showUsedCtx && (
              <div className="absolute right-0 top-6 z-50 w-56 rounded-xl border border-border bg-card p-2.5 shadow-2xl text-[11px] font-mono text-muted-foreground space-y-0.5">
                {completedActivities.length > 0 ? (
                  completedActivities.map((act) => <ActivityRow key={act.id} act={act} />)
                ) : (
                  ["Read Focus Session", "Checked Core & Lore continuity", "Compared possibilities", "Prepared response"].map((s) => (
                    <div key={s} className="flex items-center gap-2 py-0.5">
                      <span className="font-bold text-green-500">✓</span><span>{s}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? "Expand message" : "Collapse to 2 lines"}
            className="flex h-5 items-center rounded px-1.5 text-[10px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <span>{isCollapsed ? "▼ expand" : "▲ collapse"}</span>
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* When collapsed, display only 2 lines preview */}
      {isCollapsed ? (
        <div 
          onClick={() => setIsCollapsed(false)}
          className="cursor-pointer text-[12.5px] text-muted-foreground line-clamp-2 italic leading-relaxed hover:text-foreground transition"
        >
          {displayedContent || "Empty response"}
        </div>
      ) : (
        <>
          {/* Truthful Step Stream (Unified Single-Card Stream before answer) */}
          {completedActivities && completedActivities.length > 0 && (
            <HierarchicalStepStream
              steps={completedActivities}
              title="Narrative Pass & Continuity"
              subtitle={tone.label + " perspective"}
            />
          )}

          {/* Chunked cards & Lore tag semantic rendering */}
          <ChunkedCardsRenderer text={displayedContent} loreItems={loreItems} onOpenTab={onOpenTab} />

          {isFixList && (
            <div className="mt-3 space-y-2">
              {options.map((opt: string, i: number) => (
                <div key={i} className="rounded-xl border border-border/60 bg-background p-2.5">
                  <div className="text-[12.5px]">{opt}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      onClick={() => setOpenFor(openFor === `${i}` ? null : `${i}`)}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10.5px] font-semibold"
                    >
                      Add to Core ▾
                    </button>
                    {openFor === `${i}` && (
                      <div className="mt-2 space-y-1.5 rounded-lg border bg-card p-2 text-xs">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Pick a Core:</div>
                        {cores.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              onAddOptionToCore(opt, c.id);
                              setOpenFor(null);
                            }}
                            className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-muted text-left"
                          >
                            <span>{c.emoji ?? "◇"} {c.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
            <MiniBtn icon={Copy} label="Copy" onClick={onCopy} />
            <MiniBtn icon={Replace} label="Append" onClick={onAppend} />
            <MiniBtn icon={Sparkles} label="+ Core" onClick={onInsertCore} />
            {onBranch && <MiniBtn icon={GitBranch} label="Explore" onClick={onBranch} />}
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
            <MiniBtn icon={X} label="Delete" onClick={onDelete} />
          </div>

          {/* ── Tiny Recommendation Cards (Next Topics to Flesh Out) ── */}
          {message.recommendations && message.recommendations.length > 0 && (
            <div className="mt-3 border-t border-border/40 pt-2 space-y-1.5 animate-slide-up-fade">
              <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/80">
                <Sparkles className="h-2.5 w-2.5 text-primary" />
                <span>Next to flesh out:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {message.recommendations.map((rec: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectRecommendation?.(rec)}
                    title={`Explore: "${rec}"`}
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-primary/5 hover:border-primary/40 px-2 py-1 text-left text-[11px] leading-tight text-foreground transition active:scale-[0.98] group/rec"
                  >
                    <span className="text-[10px] text-primary shrink-0 opacity-70 group-hover/rec:opacity-100 font-mono">
                      ↳
                    </span>
                    <span className="truncate flex-1 font-medium">{rec}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPromotionNudge && (
            <div className="mt-3 flex items-center justify-between border-t border-amber-500/10 pt-2.5">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <Sparkles className="h-3 w-3 animate-pulse text-amber-500" />
                💡 Settled? Send to:
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={onPromoteToLore}
                  className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 transition"
                >
                  → Lore
                </button>
                <button
                  onClick={onPromoteToCore}
                  className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 transition"
                >
                  → Core
                </button>
              </div>
            </div>
          )}
        </>
      )}
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
      type="button"
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-[11px] font-semibold hover:bg-muted/70"
    >
      <Icon className={cn("h-3 w-3", spin && "animate-spin")} /> {label}
    </button>
  );
}
