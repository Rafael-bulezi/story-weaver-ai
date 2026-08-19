import { useMemo, useState } from "react";
import {
  BookMarked,
  Sparkles,
  RefreshCw,
  Edit3,
  Check,
  BarChart3,
  Users,
  Layers,
  ShieldCheck,
  Sliders,
  ArrowRight,
  BookOpen,
  MessageSquare
} from "lucide-react";
import type { BooksApi } from "@/lib/story-store";
import type { NavTab } from "@/components/story/BottomNav";
import { buildOverview, buildBookContext } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastSuccess, toastError } from "@/lib/toast";

export function ProjectHub({
  books,
  onOpenTab,
}: {
  books: BooksApi;
  onOpenTab?: (tab: NavTab) => void;
}) {
  const active = books.active!;
  
  // Continuous Summary states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(active.overview || "");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Genre / Tone Config states
  const [genre, setGenre] = useState(() => {
    return (active as any).genre || "Epic Fantasy / Sci-Fi";
  });
  const [tone, setTone] = useState(() => {
    return (active as any).tone || "Introspective, mythic, atmospheric";
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  // Active word count
  const currentChapterWc = useMemo(
    () => (active.content.trim() ? active.content.trim().split(/\s+/).length : 0),
    [active.content],
  );

  const totalWords = useMemo(() => {
    const chaptersWords = active.chapters.reduce(
      (acc, c) => acc + (c.content.trim() ? c.content.trim().split(/\s+/).length : 0),
      0
    );
    return chaptersWords + currentChapterWc;
  }, [active.chapters, currentChapterWc]);

  // ---------------------------------------------------------------------------
  // Narrative Telemetry 1: Character Presence (Active vs Dormant)
  // ---------------------------------------------------------------------------
  const characterPresence = useMemo(() => {
    const characters = active.lore.filter((l) => l.type === "character");
    if (!characters.length) return [];

    const allText = [
      active.content,
      ...active.chapters.map((c) => c.content),
    ].join(" ").toLowerCase();

    const recentText = [
      active.content,
      ...(active.chapters.slice(0, 2).map((c) => c.content)),
    ].join(" ").toLowerCase();

    return characters.map((char) => {
      const name = char.name.toLowerCase();
      const firstName = name.split(" ")[0];
      
      // Count matches
      const totalMentions = (allText.match(new RegExp(`\\b${firstName}\\b`, "g")) || []).length;
      const recentMentions = (recentText.match(new RegExp(`\\b${firstName}\\b`, "g")) || []).length;
      
      let status: "active" | "frequent" | "dormant" = "dormant";
      if (recentMentions > 0) status = "active";
      else if (totalMentions > 3) status = "frequent";

      return {
        id: char.id,
        name: char.name,
        role: char.role || "Character",
        totalMentions,
        recentMentions,
        status,
      };
    }).sort((a, b) => b.totalMentions - a.totalMentions);
  }, [active.lore, active.content, active.chapters]);

  // ---------------------------------------------------------------------------
  // Narrative Telemetry 2: Lore Density per Chapter
  // ---------------------------------------------------------------------------
  const loreDensity = useMemo(() => {
    const allChapters = [
      { id: "current", title: active.title || "Current Chapter", content: active.content },
      ...active.chapters.slice(0, 5).map((c) => ({ id: c.id, title: c.title, content: c.content })),
    ];

    return allChapters.map((ch) => {
      const text = ch.content.toLowerCase();
      let usedLoreCount = 0;
      active.lore.forEach((l) => {
        const term = l.name.toLowerCase().split(" ")[0];
        if (term.length > 2 && text.includes(term)) {
          usedLoreCount++;
        }
      });
      const words = ch.content.trim() ? ch.content.trim().split(/\s+/).length : 0;
      const densityScore = words > 0 ? Math.min(100, Math.round((usedLoreCount / (words / 150)) * 100)) : 0;

      return {
        id: ch.id,
        title: ch.title,
        loreCount: usedLoreCount,
        wordCount: words,
        densityScore,
      };
    });
  }, [active.chapters, active.content, active.lore, active.title]);

  // ---------------------------------------------------------------------------
  // Narrative Telemetry 3: Consistency Score
  // ---------------------------------------------------------------------------
  const consistencyScore = useMemo(() => {
    let base = 98;
    const pendingCount = active.lorePending?.length || 0;
    const candidateCount = active.candidates?.length || 0;
    
    base -= (pendingCount * 4);
    base -= (candidateCount * 2);
    if (!active.cores.length) base -= 15;
    if (!active.overview) base -= 5;
    
    return Math.max(40, Math.min(100, base));
  }, [active.lorePending, active.candidates, active.cores.length, active.overview]);

  // ---------------------------------------------------------------------------
  // Actions: Continuous Summary Generation
  // ---------------------------------------------------------------------------
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const context = buildBookContext(active, { includeChapter: true, brainstormTail: 4 });
      const res = await invokeAssistant({
        data: {
          mode: "summarize",
          action: "Synthesize a concise continuous summary / README overview of the story canon state and trajectory.",
          context,
        },
      });

      if (res.content?.trim()) {
        const clean = res.content.trim();
        books.updateBook(active.id, { overview: clean });
        setSummaryText(clean);
        toastSuccess("Living Continuous Summary updated!");
      }
    } catch (e: any) {
      toastError(e.message || "Failed to generate continuous summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveSummary = () => {
    books.updateBook(active.id, { overview: summaryText.trim() });
    setIsEditingSummary(false);
    toastSuccess("Project README summary saved");
  };

  const handleSaveMetadata = () => {
    books.updateBook(active.id, (b) => ({
      ...b,
      genre: genre.trim(),
      tone: tone.trim(),
    }));
    setIsEditingMeta(false);
    toastSuccess("Project rules & tone updated");
  };

  return (
    <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto pb-28 thin-scrollbar bg-background px-4 py-5 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER / README HERO
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 text-2xl font-serif">
              {active.cover ?? "◇"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Project README
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
                  v{active.chapters.length + 1}.0
                </span>
              </div>
              <h1 className="text-xl font-bold font-serif text-foreground tracking-tight mt-0.5">
                {active.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {active.title || "Main Storyline"} · Updated {new Date(active.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isGeneratingSummary && "animate-spin text-primary")} />
              {isGeneratingSummary ? "Synthesizing..." : "Sync Summary"}
            </Button>
          </div>
        </div>

        {/* Global Metadata Badges */}
        <div className="mt-4 pt-3.5 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl bg-background/70 border border-border/40 p-2.5">
            <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Genre</span>
            <span className="font-semibold text-foreground truncate block mt-0.5">{genre}</span>
          </div>
          <div className="rounded-xl bg-background/70 border border-border/40 p-2.5">
            <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Canon Health</span>
            <span className="font-semibold text-emerald-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" /> {consistencyScore}%
            </span>
          </div>
          <div className="rounded-xl bg-background/70 border border-border/40 p-2.5">
            <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Total Words</span>
            <span className="font-mono font-semibold text-foreground block mt-0.5">{totalWords.toLocaleString()}</span>
          </div>
          <div className="rounded-xl bg-background/70 border border-border/40 p-2.5">
            <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">Active Lore</span>
            <span className="font-semibold text-foreground block mt-0.5">{active.lore.length} entities</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CONTINUOUS SUMMARY (LIVING CANON OVERVIEW)
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookMarked className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Continuous Canon Summary</h2>
              <p className="text-[10.5px] text-muted-foreground">The living high-level truth synchronized across all chapters & AI prompts.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingSummary ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSummaryText(active.overview || buildOverview(active));
                  setIsEditingSummary(true);
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingSummary(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSummary}
                  className="h-7 text-xs gap-1"
                >
                  <Check className="h-3 w-3" /> Save
                </Button>
              </div>
            )}
          </div>
        </div>

        {isEditingSummary ? (
          <Textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            rows={5}
            placeholder="Continuous summary of the story's core conflicts, world rules, and state..."
            className="text-xs leading-relaxed bg-background"
          />
        ) : (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {active.overview?.trim() ? (
              active.overview
            ) : (
              <div className="text-muted-foreground italic flex flex-col gap-2">
                <span>No continuous summary generated yet. Click "Sync Summary" to auto-synthesize from your canon cores and lore.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateSummary}
                  className="self-start gap-1 text-[11px] h-7"
                >
                  <Sparkles className="h-3 w-3 text-primary" /> Auto-generate Living Summary
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NARRATIVE TELEMETRY DASHBOARD
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Narrative Telemetry</h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Live Health Diagnostics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Telemetry Card A: Character Presence */}
          <div className="rounded-3xl border border-border/80 bg-card p-4.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-foreground">Character Presence</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {characterPresence.length} tracked
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-1">
              {characterPresence.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No character lore entities detected yet.
                </div>
              ) : (
                characterPresence.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center justify-between rounded-xl bg-background/80 border border-border/40 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{char.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{char.role}</div>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {char.totalMentions} mentions
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          char.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : char.status === "frequent"
                            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        )}
                      >
                        {char.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Telemetry Card B: Lore Density by Chapter */}
          <div className="rounded-3xl border border-border/80 bg-card p-4.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-foreground">Lore Density</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Entities / 150w
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-1">
              {loreDensity.map((item) => (
                <div
                  key={item.id}
                  className="space-y-1 rounded-xl bg-background/80 border border-border/40 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {item.loreCount} lore / {item.wordCount} words
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.densityScore > 60
                          ? "bg-emerald-500"
                          : item.densityScore > 25
                          ? "bg-primary"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${Math.max(10, item.densityScore)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. PROJECT CONFIGURATION (GENRE, TONE, CANON RULES)
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Project Configuration & Rules</h2>
              <p className="text-[10.5px] text-muted-foreground">Tone and stylistic constraints injected into writer prompts.</p>
            </div>
          </div>

          {!isEditingMeta ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingMeta(true)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingMeta(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMetadata}
                className="h-7 text-xs gap-1"
              >
                <Check className="h-3 w-3" /> Save
              </Button>
            </div>
          )}
        </div>

        {isEditingMeta ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Narrative Tone & Voice</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Target Genre
              </span>
              <p className="font-semibold text-foreground mt-0.5">{genre}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Tone & Atmosphere
              </span>
              <p className="font-semibold text-foreground mt-0.5">{tone}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. QUICK SHORTCUT NAVIGATOR
          ───────────────────────────────────────────────────────────── */}
      {onOpenTab && (
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
            Jump to Tools
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "chat" as NavTab, label: "Writer Canvas", icon: BookOpen },
              { id: "brainstorm" as NavTab, label: "Brainstorming", icon: MessageSquare },
              { id: "lore" as NavTab, label: "World Lore", icon: Users },
              { id: "cores" as NavTab, label: "Canon Cores", icon: Layers },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => onOpenTab(tool.id)}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-3 text-left hover:border-primary/40 hover:bg-muted/40 transition group"
              >
                <div className="flex items-center gap-2">
                  <tool.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{tool.label}</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// Export as StudioTab for backward compatibility
export const StudioTab = ProjectHub;
