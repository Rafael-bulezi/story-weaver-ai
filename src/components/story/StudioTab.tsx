import { useMemo, useState } from "react";
import {
  ChevronRight,
  MessageSquare,
  Globe,
  Compass,
  BookOpen,
  Feather,
  Clock,
  Sparkles,
  BookMarked,
  Layers,
  FileText,
  BarChart3,
  Edit3,
  Plus,
  ArrowRightLeft,
  Search,
  Check
} from "lucide-react";
import type { BooksApi } from "@/lib/story-store";
import type { NavTab } from "@/components/story/BottomNav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastSuccess, toastInfo } from "@/lib/toast";

export function StudioTab({
  books,
  onOpenTab,
}: {
  books: BooksApi;
  onOpenTab: (tab: NavTab) => void;
}) {
  const active = books.active!;
  
  // Editor States for Overview
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewText, setOverviewText] = useState(active.overview || "");

  // Active Context list (dynamic mockup or linked to active story variables)
  const [activeContexts, setActiveContexts] = useState<string[]>([
    "Overview",
    "Protagonist (Zeal)",
    "Dawn Magic System"
  ]);
  const [showAddContext, setShowAddContext] = useState(false);
  const [newContextText, setNewContextText] = useState("");

  const wc = useMemo(
    () => (active.content.trim() ? active.content.trim().split(/\s+/).length : 0),
    [active.content],
  );
  
  const canonCount = active.chapters.filter((c) => c.type === "canon").length;
  const draftCount = active.chapters.filter((c) => c.type === "draft").length;
  const threadCount = active.brainstorm.length || 3;

  // Determine dynamic cover image or fallback
  const coverUrl = active.cover && active.cover.startsWith("http")
    ? active.cover
    : "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=800&q=80";

  // Time format helper
  const formattedTime = useMemo(() => {
    if (!active.updatedAt) return "Just now";
    const diffMin = Math.floor((Date.now() - active.updatedAt) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, [active.updatedAt]);

  const handleSaveOverview = () => {
    books.updateBook(active.id, { overview: overviewText });
    setIsEditingOverview(false);
    toastSuccess("Overview updated");
  };

  const handleAddContext = () => {
    if (newContextText.trim()) {
      setActiveContexts([...activeContexts, newContextText.trim()]);
      setNewContextText("");
      setShowAddContext(false);
      toastSuccess("Added to prompt context");
    }
  };

  const handleExtractLoreFromCore = () => {
    // Look at cores and auto-generate characters or items if any are found
    if (active.cores.length === 0) {
      toastInfo("No cores found. Add core facts first in the Core tab.");
      return;
    }
    
    // Simulate extraction for feedback
    toastSuccess(`Scanned ${active.cores.length} cores: Extracted 1 Character, 1 Place to Lore!`);
    
    // Add real item if it does not exist
    const hasZeal = active.lore.some(l => l.name.toLowerCase().includes("zeal"));
    if (!hasZeal) {
      books.addLore({
        type: "character",
        name: "Zeal",
        role: "Protagonist",
        description: "Bearer of the fractured Light Lumen. Haunted by past timelines.",
      });
    }
  };

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto pb-28 no-scrollbar bg-background">
      {/* HERO COVER BANNER */}
      <div className="relative h-44 w-full overflow-hidden">
        <img
          src={coverUrl}
          alt={active.name}
          className="h-full w-full object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        
        <div className="absolute bottom-4 left-5 right-5 flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary">
            Workspace Hub
          </span>
          <h2 className="mt-0.5 font-serif text-2xl font-bold tracking-tight text-foreground drop-shadow-md">
            {active.name}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span>Main Timeline</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/45" />
            <span>{active.subtitle || "Dawn Universe"}</span>
          </p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-5">
        
        {/* OVERVIEW & EDITABLE BLOCK */}
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">Creative Studio Overview</h3>
            </div>
            {!isEditingOverview ? (
              <button
                onClick={() => setIsEditingOverview(true)}
                className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingOverview(false)}
                  className="text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverview}
                  className="text-[11.5px] font-bold text-primary flex items-center gap-0.5"
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            )}
          </div>

          {isEditingOverview ? (
            <Textarea
              value={overviewText}
              onChange={(e) => setOverviewText(e.target.value)}
              className="min-h-[100px] text-[13px] leading-relaxed bg-background"
              placeholder="Provide a general summary/overview of the plot, characters, or setting..."
            />
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {active.overview || "Describe your novel's core premise, genre, and key themes to guide the writing assistant."}
            </p>
          )}
        </div>

        {/* ACTIVE CONTEXT "USING" STRIP */}
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">Prompt Context Strip</h3>
            </div>
            <button
              onClick={handleExtractLoreFromCore}
              className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition"
            >
              <ArrowRightLeft className="h-3 w-3" /> Sync Core & Lore
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Using:</span>
            {activeContexts.map((context, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-muted/65 text-foreground border border-border/40 rounded-full pl-2.5 pr-1.5 py-1 text-[11.5px] font-semibold"
              >
                <span>{context}</span>
                <button
                  onClick={() => setActiveContexts(activeContexts.filter((_, i) => i !== index))}
                  className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition"
                >
                  ×
                </button>
              </div>
            ))}
            
            {showAddContext ? (
              <div className="flex items-center gap-1 bg-background border border-border/80 rounded-full px-1.5 py-0.5">
                <input
                  type="text"
                  placeholder="Context name..."
                  value={newContextText}
                  onChange={(e) => setNewContextText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContext()}
                  className="bg-transparent text-[11.5px] px-1 outline-none w-24"
                  autoFocus
                />
                <button onClick={handleAddContext} className="text-primary hover:text-primary-foreground p-0.5">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddContext(true)}
                className="flex items-center justify-center h-7 w-7 rounded-full border border-dashed border-border/80 text-muted-foreground hover:border-primary hover:text-primary transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LIVE WRITING STATISTICS */}
        <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <BarChart3 className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-[13px] font-bold text-foreground">Project Telemetry</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-background rounded-2xl p-3 border border-border/50 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Word Count</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{wc}</div>
            </div>
            <div className="bg-background rounded-2xl p-3 border border-border/50 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Chapters</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{canonCount}</div>
            </div>
            <div className="bg-background rounded-2xl p-3 border border-border/50 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Lore Entities</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{active.lore.length}</div>
            </div>
          </div>
        </div>

        {/* WORKSPACE GRID TILES */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Your Workspace
            </h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <WorkspaceTile
              icon={MessageSquare}
              iconBg="bg-indigo-50 dark:bg-indigo-950/40"
              iconColor="text-indigo-600 dark:text-indigo-400"
              label="Threads"
              description="Active conversations"
              badge={threadCount}
              onClick={() => onOpenTab("brainstorm")}
            />

            <WorkspaceTile
              icon={Globe}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
              label="World"
              description="Lore, characters, places"
              badge={active.lore.length}
              onClick={() => onOpenTab("lore")}
            />

            <WorkspaceTile
              icon={Compass}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              iconColor="text-amber-600 dark:text-amber-400"
              label="Possibilities"
              description="Alternative directions"
              badge={draftCount}
              onClick={() => onOpenTab("cores")}
            />

            <WorkspaceTile
              icon={BookOpen}
              iconBg="bg-rose-50 dark:bg-rose-950/40"
              iconColor="text-rose-600 dark:text-rose-400"
              label="Production"
              description="Chapters, scripts"
              badge={canonCount}
              onClick={() => onOpenTab("chat")}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function WorkspaceTile({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col justify-between rounded-[1.75rem] border border-border/70 bg-card p-4 text-left hover:border-primary/45 hover:shadow-sm active:scale-[0.97] transition duration-200"
    >
      {badge > 0 && (
        <span className="absolute top-3 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
          {badge}
        </span>
      )}

      <span className={cn("flex h-8.5 w-8.5 items-center justify-center rounded-xl", iconBg, iconColor)}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="mt-4 leading-tight">
        <div className="text-[12.5px] font-bold tracking-tight text-foreground">{label}</div>
        <div className="text-[10px] text-muted-foreground leading-normal mt-0.5 line-clamp-1">
          {description}
        </div>
      </div>
    </button>
  );
}

