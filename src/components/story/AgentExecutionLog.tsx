import {
  Sparkles,
  ChevronDown,
  X,
  FileText,
  BookOpen,
  Database,
  Layers,
  GitBranch,
  Terminal,
  PenTool,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HierarchicalStep, StepState, StepIconType } from "./ActivityStream";
import { leavesOf, stateOf } from "./ActivityStream";

/**
 * Agent Execution Log Strip pinned above the composer
 * Displays the active execution state with a green glowing orb (breathing/pulsing).
 */
export function AgentExecutionLog({
  activities,
  isBusy,
  expanded,
  onToggleExpand,
}: {
  activities: HierarchicalStep[];
  isBusy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  // If no activities and not busy, don't show the strip
  if (activities.length === 0 && !isBusy) return null;

  const leaves = activities.flatMap(leavesOf);
  const completedCount = leaves.filter((l) => l.state === "complete").length;
  const activeLeaf = leaves.find((l) => l.state === "active") || leaves[leaves.length - 1];
  const allComplete = leaves.length > 0 && completedCount === leaves.length;

  const hasEvidence = leaves.some((l) => l.evidence && l.evidence !== "generated");

  // Honest label & current step title
  const currentStepTitle = isBusy
    ? activeLeaf?.label || (hasEvidence ? "Executing operations…" : "Composing plan…")
    : allComplete
      ? hasEvidence
        ? "Execution complete"
        : "Plan complete"
      : "Agent ready";

  return (
    <div className="w-full border-b border-border/50 bg-muted/30 backdrop-blur-xs transition-colors duration-200">
      {/* Docked Strip Bar */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition select-none text-xs"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Orb indicator: cyan for composing plan, emerald for real executed operations */}
          {isBusy ? (
            <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              <span
                className={cn(
                  "absolute inset-[-4px] rounded-full animate-ping",
                  hasEvidence ? "bg-emerald-500/30" : "bg-cyan-500/30"
                )}
              />
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  hasEvidence
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]"
                    : "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.95)]"
                )}
              />
            </span>
          ) : allComplete ? (
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-2.5 w-2.5 stroke-[2.5]" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50 shrink-0" />
          )}

          {/* Log Label & Current Step Title */}
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-muted-foreground/90 shrink-0">
            {hasEvidence ? "Agent Execution Log:" : "Agent Plan:"}
          </span>
          <span className="text-[12px] font-medium text-foreground truncate">
            {currentStepTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {leaves.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground/80 font-semibold bg-muted/60 px-1.5 py-0.5 rounded">
              {completedCount}/{leaves.length}
            </span>
          )}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition p-0.5"
            aria-label={expanded ? "Collapse execution log" : "Expand execution log"}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Expanded Hierarchical Step View */}
      {expanded && activities.length > 0 && (
        <div className="border-t border-border/40 bg-background/80 p-2 space-y-1 font-mono text-xs max-h-56 overflow-y-auto thin-scrollbar">
          {activities.map((st) => (
            <ExecutionLogRow key={st.id} step={st} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutionLogRow({ step }: { step: HierarchicalStep }) {
  const isParent = !!(step.children && step.children.length > 0);
  const state = stateOf(step);

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg transition-colors text-[11.5px]",
          isParent ? "font-semibold text-foreground" : "text-muted-foreground",
          state === "active" && "bg-cyan-500/10 text-cyan-400 font-medium"
        )}
      >
        {/* Status Indicator */}
        {state === "complete" ? (
          <span className="flex h-3 w-3 shrink-0 items-center justify-center">
            <Check className="h-3 w-3 text-emerald-500 stroke-[2.5]" />
          </span>
        ) : state === "active" ? (
          <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
            <span className="absolute inset-[-3px] rounded-full bg-cyan-500/25 animate-ping" />
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full border border-muted-foreground/40 bg-transparent shrink-0 ml-0.5 mr-0.5" />
        )}

        {/* Action Icon */}
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground">
          <LogStepIcon icon={step.icon} />
        </span>

        {/* Label */}
        <span className="flex-1 truncate">{step.label}</span>

        {/* Honest Evidence Tag */}
        {!isParent && (
          <span
            className={cn(
              "shrink-0 rounded border px-1 font-mono text-[9px] uppercase tracking-wider",
              step.evidence === "retrieved" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
              step.evidence === "verified" && "border-cyan-400/30 text-cyan-400 bg-cyan-400/10",
              (!step.evidence || step.evidence === "generated") &&
                "border-border/40 text-muted-foreground/60"
            )}
          >
            {step.evidence === "retrieved"
              ? `${step.sourceRefs?.length ?? 1} src`
              : step.evidence === "verified"
                ? "verified"
                : "generated"}
          </span>
        )}

        {/* Counts for parent */}
        {isParent && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {leavesOf(step).filter((l) => l.state === "complete").length}/{leavesOf(step).length}
          </span>
        )}
      </div>

      {/* Children */}
      {isParent && (
        <div className="ml-3 pl-2 border-l border-border/50 space-y-0.5 mt-0.5">
          {step.children!.map((child) => (
            <ExecutionLogRow key={child.id} step={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogStepIcon({ icon }: { icon: StepIconType }) {
  switch (icon) {
    case "doc":
      return <FileText className="h-3 w-3" />;
    case "chapter":
      return <BookOpen className="h-3 w-3" />;
    case "lore":
    case "db":
      return <Database className="h-3 w-3" />;
    case "core":
      return <Layers className="h-3 w-3" />;
    case "timeline":
    case "branch":
      return <GitBranch className="h-3 w-3" />;
    case "cmd":
      return <Terminal className="h-3 w-3" />;
    case "pen":
      return <PenTool className="h-3 w-3" />;
    case "shield":
      return <ShieldCheck className="h-3 w-3" />;
    default:
      return <Sparkles className="h-3 w-3" />;
  }
}
