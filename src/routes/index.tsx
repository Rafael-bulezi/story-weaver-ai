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
  X,
  Send,
  Loader2,
  ChevronDown,
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
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useLore,
  useStory,
  loreToPrompt,
  type LoreItem,
  type LoreType,
} from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: StoryCanvasApp,
  head: () => ({
    meta: [
      { property: "og:title", content: "Story Canvas — Write worlds that remember themselves" },
      { property: "og:description", content: "A pocket-sized AI storytelling workspace with living world memory, critic mode, and alternate-direction debate." },
    ],
  }),
});

type Mode = "writer" | "critic" | "debater";

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

const QUICK_ACTIONS: { label: string; hint: string; mode: Mode; action: string; icon: typeof Feather }[] = [
  { label: "Continue", hint: "Write next part", mode: "writer", action: "Continue the scene naturally from where it ends. Keep tone and pacing consistent.", icon: Feather },
  { label: "Describe", hint: "Add more detail", mode: "writer", action: "Rewrite the last paragraph with more sensory detail — sight, sound, texture, temperature — without changing what happens.", icon: Sparkles },
  { label: "Critic Check", hint: "Spot plot holes", mode: "critic", action: "Review the current scene for plot holes, unclear motivation, or continuity gaps against the world lore.", icon: ScanSearch },
  { label: "Debate", hint: "Explore alternatives", mode: "debater", action: "Propose bold alternate directions the story could take from this exact point.", icon: Scale },
  { label: "Save to Lore", hint: "Extract entities", mode: "writer", action: "Read the current scene and extract any new characters, places, or concepts worth adding to the world lore. Return as a compact bulleted list: TYPE — NAME — one-line description.", icon: BookmarkPlus },
];

function StoryCanvasApp() {
  const { story, update } = useStory();
  const lore = useLore();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [loreOpen, setLoreOpen] = useState(false);
  const [askInput, setAskInput] = useState("");
  const invoke = useServerFn(invokeAssistant);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const wordCount = useMemo(
    () => (story.content.trim() ? story.content.trim().split(/\s+/).length : 0),
    [story.content],
  );

  async function run(mode: Mode | "chat", action: string, options?: { openPanel?: boolean; userPrompt?: string; busyKey?: string }) {
    const busyKey = options?.busyKey ?? `${mode}:${action.slice(0, 24)}`;
    setBusy(busyKey);
    if (options?.openPanel !== false) setAiOpen(true);
    try {
      const { content } = await invoke({
        data: {
          mode,
          action,
          story: story.content,
          lore: loreToPrompt(lore.items),
          userPrompt: options?.userPrompt ?? "",
        },
      });
      const label = mode === "chat"
        ? "Assistant"
        : MODES.find((m) => m.id === mode)?.label ?? "Assistant";
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
    const el = editorRef.current;
    const addition = `\n\n${text.trim()}`;
    if (el) {
      const pos = el.selectionStart ?? story.content.length;
      const next = story.content.slice(0, pos) + addition + story.content.slice(pos);
      update({ content: next });
    } else {
      update({ content: story.content + addition });
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

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border/70 bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center gap-2 py-3">
          <Sheet open={loreOpen} onOpenChange={setLoreOpen}>
            <SheetTrigger asChild>
              <button className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-muted" aria-label="Open world">
                <BookOpen className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <LoreSheet lore={lore} />
          </Sheet>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Story Canvas
            </span>
            <button className="flex items-center gap-1 text-sm font-semibold">
              {story.title}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 py-3">
          <button
            onClick={() => setAiOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--writer-bg)] px-3 text-xs font-semibold text-[color:var(--writer)] transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Assistant
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-muted" aria-label="More">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-2xl flex-col px-5 pt-5">
          <input
            aria-label="Chapter title"
            value={story.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mb-3 bg-transparent font-serif text-2xl font-semibold outline-none"
          />
          <textarea
            ref={editorRef}
            value={story.content}
            onChange={(e) => update({ content: e.target.value })}
            placeholder="Begin your world…"
            className="prose-story min-h-0 flex-1 resize-none bg-transparent outline-none no-scrollbar"
          />
          <div className="flex items-center justify-between border-t border-border/60 py-2 text-[11px] text-muted-foreground">
            <span>{wordCount} words</span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" /> Saved locally
            </span>
          </div>
        </div>
      </main>

      {/* Bottom quick actions carousel */}
      <div className="border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            const key = `qa:${a.label}`;
            const isBusy = busy === key;
            return (
              <button
                key={a.label}
                disabled={!!busy}
                onClick={() => run(a.mode, a.action, { busyKey: key })}
                className={cn(
                  "flex min-w-[132px] shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2.5 text-left shadow-[0_1px_0_rgba(20,20,30,0.02)] transition active:scale-[0.98]",
                  busy && !isBusy && "opacity-50",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  a.mode === "writer" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]",
                  a.mode === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]",
                  a.mode === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]",
                )}>
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold">{a.label}</span>
                  <span className="text-[10.5px] text-muted-foreground">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Assistant sheet */}
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
              <button onClick={() => setAiOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode chips */}
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
                      "flex flex-col items-start gap-1 rounded-2xl border border-border/70 p-3 text-left transition active:scale-[0.98]",
                      m.id === "writer" && "bg-[color:var(--writer-bg)]",
                      m.id === "critic" && "bg-[color:var(--critic-bg)]",
                      m.id === "debater" && "bg-[color:var(--debater-bg)]",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isBusy ? (
                        <Loader2 className={cn("h-3.5 w-3.5 animate-spin",
                          m.id === "writer" && "text-[color:var(--writer)]",
                          m.id === "critic" && "text-[color:var(--critic)]",
                          m.id === "debater" && "text-[color:var(--debater)]",
                        )} />
                      ) : (
                        <Icon className={cn("h-3.5 w-3.5",
                          m.id === "writer" && "text-[color:var(--writer)]",
                          m.id === "critic" && "text-[color:var(--critic)]",
                          m.id === "debater" && "text-[color:var(--debater)]",
                        )} />
                      )}
                      <span className={cn("text-[13px] font-semibold",
                        m.id === "writer" && "text-[color:var(--writer)]",
                        m.id === "critic" && "text-[color:var(--critic)]",
                        m.id === "debater" && "text-[color:var(--debater)]",
                      )}>{m.label}</span>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground">{m.sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Messages */}
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
                    update({ content: story.content.replace(/\s*$/, "") + `\n\n${m.content.trim()}` });
                    toast.success("Appended to scene");
                    setAiOpen(false);
                  }}
                  onCopy={() => copyText(m.content)}
                />
              ))}
            </div>

            {/* Composer */}
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
                  {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
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
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onInsert}>
          <ArrowRight className="mr-1 h-3 w-3" /> Insert
        </Button>
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onReplace}>
          <Replace className="mr-1 h-3 w-3" /> Append
        </Button>
        <Button size="sm" variant="secondary" className="h-7 rounded-full bg-white/70 px-2.5 text-[11px] hover:bg-white" onClick={onCopy}>
          <Copy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </div>
    </div>
  );
}

function LoreSheet({ lore }: { lore: ReturnType<typeof useLore> }) {
  const [active, setActive] = useState<LoreType>("character");
  const [draft, setDraft] = useState<{ open: boolean; name: string; role: string; description: string }>({
    open: false, name: "", role: "", description: "",
  });

  const filtered = lore.items.filter((i) => i.type === active);

  return (
    <SheetContent side="left" className="w-[86vw] max-w-sm border-r border-border p-0">
      <div className="flex h-full flex-col">
        <SheetHeader className="px-5 pb-2 pt-5 text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> World
            </SheetTitle>
            <button
              onClick={() => setDraft({ open: true, name: "", role: "", description: "" })}
              className="flex h-8 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        </SheetHeader>

        <Tabs value={active} onValueChange={(v) => setActive(v as LoreType)} className="flex flex-1 flex-col overflow-hidden px-3">
          <TabsList className="mx-2 grid w-auto grid-cols-3 rounded-full bg-muted p-1">
            <TabsTrigger value="character" className="rounded-full text-xs">Characters</TabsTrigger>
            <TabsTrigger value="place" className="rounded-full text-xs">Places</TabsTrigger>
            <TabsTrigger value="concept" className="rounded-full text-xs">Concepts</TabsTrigger>
          </TabsList>

          <TabsContent value={active} className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
            {draft.open && (
              <div className="mb-3 space-y-2 rounded-2xl border border-border bg-card p-3">
                <Input
                  placeholder="Name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
                <Input
                  placeholder={active === "character" ? "Role (e.g. Protagonist)" : active === "place" ? "Kind (e.g. City)" : "Category"}
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                />
                <Textarea
                  rows={3}
                  placeholder="Description — what should the AI always remember?"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ open: false, name: "", role: "", description: "" })}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!draft.name.trim()}
                    onClick={() => {
                      lore.add({ type: active, name: draft.name.trim(), role: draft.role.trim() || undefined, description: draft.description.trim() });
                      setDraft({ open: false, name: "", role: "", description: "" });
                      toast.success("Added to world");
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filtered.length === 0 && !draft.open && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nothing here yet.<br />Tap <span className="font-semibold">Add</span> to build your world.
                </div>
              )}
              {filtered.map((item) => (
                <LoreRow key={item.id} item={item} onDelete={() => lore.remove(item.id)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SheetContent>
  );
}

function LoreRow({ item, onDelete }: { item: LoreItem; onDelete: () => void }) {
  const Icon = item.type === "character" ? User : item.type === "place" ? MapPin : Lightbulb;
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name}</div>
            {item.role && <div className="text-[11px] text-muted-foreground">{item.role}</div>}
          </div>
          <button onClick={onDelete} className="opacity-40 transition hover:opacity-100" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {item.description && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>
    </div>
  );
}
