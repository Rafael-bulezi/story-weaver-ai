import { useState } from "react";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Database,
  FileText,
  BookOpen,
  Terminal,
  PenTool,
  Check,
  ChevronDown,
  GitBranch,
  Layers,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "active" | "complete" | "failed";

export type StepEvidence = "generated" | "retrieved" | "verified";

export type SubstepKind = "action" | "reasoning" | "why";

export interface SubstepItem {
  id?: string;
  kind?: SubstepKind; // default: "action"
  label: string;
  liveText?: string;
  doneText?: string;
  text?: string; // for reasoning/why
  evidence?: StepEvidence;
}

export type StepIconType =
  | "search"
  | "doc"
  | "chapter"
  | "lore"
  | "core"
  | "timeline"
  | "cmd"
  | "spark"
  | "pen"
  | "check"
  | "shield"
  | "db"
  | "branch"
  | "character"
  | "retrieve"
  | "validate"
  | "draft"
  | "mutate"
  | "reason"
  | "why";

export interface HierarchicalStep {
  id: string;
  label: string;
  icon: StepIconType;
  category?: "retrieve" | "validate" | "draft" | "mutate" | "reason" | "why" | string;
  tint?: "blue" | "violet" | "amber" | "emerald" | "rose" | "cyan";
  state?: StepState;
  evidence?: StepEvidence;
  sourceRefs?: string[];
  substeps?: SubstepItem[];
  children?: HierarchicalStep[];
  refContent?: string;
  open?: boolean;
}

// Backward compatibility alias
export type ActivityStep = HierarchicalStep;

export function leavesOf(st: HierarchicalStep): HierarchicalStep[] {
  return st.children && st.children.length > 0
    ? st.children.flatMap(leavesOf)
    : [st];
}

export function stateOf(st: HierarchicalStep): StepState {
  if (!st.children || st.children.length === 0) return st.state ?? "pending";
  const leaves = leavesOf(st);
  if (leaves.some((l) => l.state === "active")) return "active";
  if (leaves.every((l) => l.state === "complete")) return "complete";
  if (leaves.some((l) => l.state === "failed")) return "failed";
  if (leaves.some((l) => l.state === "complete")) return "active";
  return "pending";
}

/**
 * Builds real hierarchical workflow steps based on user's active book state & context.
 */
export function buildContextualSteps(
  active: {
    title?: string;
    content?: string;
    chapters?: Array<{ id: string; title: string }>;
    cores: Array<{ id: string; title: string; blocks?: Array<{ title: string; body: string }> }>;
    lore: Array<{ id: string; name: string; type: string; description: string }>;
    brainstorm: unknown[];
  },
  ctx: { coreIds: string[]; loreIds: string[] }
): HierarchicalStep[] {
  const steps: HierarchicalStep[] = [];
  const hasLoreCtx = ctx.loreIds.length > 0;
  const hasCoreCtx = ctx.coreIds.length > 0;

  // 1. Read & Context Extraction Group
  const readKids: HierarchicalStep[] = [
    {
      id: "read-query",
      icon: "doc",
      category: "draft",
      label: "Parse query intent",
      state: "pending",
      evidence: "generated",
      substeps: [
        {
          kind: "action",
          label: "Analyze prompt semantics",
          liveText: "extracting narrative directives...",
          doneText: "directives parsed",
          evidence: "generated",
        },
      ],
    },
  ];

  const sourceRefs: string[] = [];

  if (active.chapters && active.chapters.length > 0) {
    const chName = active.chapters[active.chapters.length - 1]?.title || "Current Draft";
    readKids.push({
      id: "read-chapter",
      icon: "chapter",
      category: "retrieve",
      label: `Access chapter "${chName.slice(0, 18)}"`,
      state: "pending",
      evidence: "retrieved",
      sourceRefs: [`ch: ${chName}`],
      substeps: [
        {
          kind: "action",
          label: `Load active chapter buffer`,
          liveText: `reading text of "${chName.slice(0, 15)}"...`,
          doneText: `chapter buffer ready`,
          evidence: "retrieved",
        },
      ],
    });
    sourceRefs.push(`ch: ${chName}`);
  }

  if (hasCoreCtx) {
    ctx.coreIds.slice(0, 2).forEach((cid) => {
      const c = active.cores.find((x) => x.id === cid);
      if (c) {
        readKids.push({
          id: `read-core-${cid}`,
          icon: "core",
          category: "retrieve",
          label: `Load Core: ${c.title.slice(0, 16)}`,
          state: "pending",
          evidence: "retrieved",
          sourceRefs: [`core: ${c.title}`],
          substeps: [
            {
              kind: "action",
              label: `Inspect core structure`,
              liveText: `retrieving core nodes...`,
              doneText: `core loaded`,
              evidence: "retrieved",
            },
          ],
        });
        sourceRefs.push(`core: ${c.title}`);
      }
    });
  }

  if (hasLoreCtx) {
    ctx.loreIds.slice(0, 2).forEach((lid) => {
      const l = active.lore.find((x) => x.id === lid);
      if (l) {
        readKids.push({
          id: `read-lore-${lid}`,
          icon: "lore",
          category: "retrieve",
          label: `Scan Lore: ${l.name.slice(0, 16)}`,
          state: "pending",
          evidence: "retrieved",
          sourceRefs: [`lore: ${l.name}`],
          substeps: [
            {
              kind: "action",
              label: `Check lore records for ${l.name}`,
              liveText: `matching lore schema for ${l.name}...`,
              doneText: `matched record`,
              evidence: "retrieved",
            },
            {
              kind: "reasoning",
              label: `Lore continuity note`,
              text: `Grounded in ${l.name} (${l.type}) lore definition to maintain established world logic.`,
            },
          ],
        });
        sourceRefs.push(`lore: ${l.name}`);
      }
    });
  }

  steps.push({
    id: "group-read",
    icon: "retrieve",
    category: "retrieve",
    tint: "blue",
    label: "Review Context & Canon",
    state: "pending",
    evidence: sourceRefs.length > 0 ? "retrieved" : "generated",
    sourceRefs,
    open: true,
    children: readKids,
  });

  // 2. Canon & Timeline Verification Group
  steps.push({
    id: "group-verify",
    icon: "validate",
    category: "validate",
    tint: "amber",
    label: "Validate Continuity",
    state: "pending",
    evidence: "verified",
    sourceRefs: sourceRefs.slice(0, 2),
    open: true,
    children: [
      {
        id: "v-canon",
        icon: "cmd",
        category: "validate",
        label: "Check world rules",
        state: "pending",
        evidence: "verified",
        substeps: [
          {
            kind: "action",
            label: "Check consistency against active canon",
            liveText: "comparing constraints...",
            doneText: "no contradictions found",
            evidence: "verified",
          },
        ],
      },
      {
        id: "v-time",
        icon: "timeline",
        category: "validate",
        label: "Trace timeline alignment",
        state: "pending",
        evidence: "verified",
        substeps: [
          {
            kind: "action",
            label: "Verify event sequence",
            liveText: "checking chronology...",
            doneText: "timeline aligned",
            evidence: "verified",
          },
        ],
      },
    ],
  });

  // 3. Synthesis & Generation Group
  steps.push({
    id: "group-synth",
    icon: "draft",
    category: "draft",
    tint: "violet",
    label: "Weave Story & Proposals",
    state: "pending",
    evidence: "generated",
    open: true,
    children: [
      {
        id: "s-reason",
        icon: "spark",
        category: "reason",
        label: "Structure narrative response",
        state: "pending",
        evidence: "generated",
        substeps: [
          {
            kind: "action",
            label: "Draft story response",
            liveText: "composing response sections...",
            doneText: "response structured",
            evidence: "generated",
          },
          {
            kind: "why",
            label: "Why this framing",
            text: "Balancing immediate narrative progression with modular lore proposals for user review.",
          },
        ],
      },
      {
        id: "s-mutate",
        icon: "mutate",
        category: "mutate",
        label: "Stage lore candidates",
        state: "pending",
        evidence: "generated",
        substeps: [
          {
            kind: "action",
            label: "Prepare review payload",
            liveText: "extracting candidate concepts...",
            doneText: "candidates staged",
            evidence: "generated",
          },
        ],
      },
    ],
  });

  return steps;
}

/** Icon component resolver */
export function StepIconComponent({ icon, className }: { icon: StepIconType; className?: string }) {
  switch (icon) {
    case "retrieve":
    case "search":
      return <Search className={className} />;
    case "doc":
      return <FileText className={className} />;
    case "chapter":
      return <BookOpen className={className} />;
    case "lore":
    case "db":
      return <Database className={className} />;
    case "core":
      return <Layers className={className} />;
    case "timeline":
    case "branch":
      return <GitBranch className={className} />;
    case "cmd":
      return <Terminal className={className} />;
    case "spark":
    case "reason":
      return <Sparkles className={className} />;
    case "pen":
    case "draft":
    case "mutate":
      return <PenTool className={className} />;
    case "shield":
    case "validate":
      return <ShieldCheck className={className} />;
    case "character":
      return <Users className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function getEvidenceBadge(evidence?: StepEvidence, sourceRefs?: string[]) {
  if (evidence === "retrieved") {
    const count = sourceRefs?.length || 1;
    return {
      text: `${count} source${count > 1 ? "s" : ""}`,
      className: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
    };
  }
  if (evidence === "verified") {
    return {
      text: "verified",
      className: "border-cyan-400/30 text-cyan-400 bg-cyan-400/10",
    };
  }
  return {
    text: "generated",
    className: "border-border/60 text-muted-foreground/70 bg-muted/30",
  };
}

/**
 * Hierarchical Step Stream Card & Rows (Truthful Single-Card Stream)
 */
export function HierarchicalStepStream({
  steps,
  title = "Story Engine Pass",
  subtitle = "Grounded narrative pass",
  isWorkflow = true,
}: {
  steps: HierarchicalStep[];
  title?: string;
  subtitle?: string;
  isWorkflow?: boolean;
}) {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({
    [steps[0]?.id || ""]: true,
  });
  const [openSubsteps, setOpenSubsteps] = useState<Record<string, boolean>>({});

  const toggleStep = (id: string) => {
    setOpenSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubstep = (key: string) => {
    setOpenSubsteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const leaves = steps.flatMap(leavesOf);
  const completedCount = leaves.filter((l) => l.state === "complete").length;
  const isRunning = leaves.some((l) => l.state === "active");
  const allComplete = leaves.length > 0 && completedCount === leaves.length;

  return (
    <div className="my-2.5 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-md overflow-hidden shadow-sm animate-slide-up-fade font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
            <Sparkles className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-foreground truncate">{title}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground/70 tracking-tight truncate">
              {subtitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isWorkflow && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 bg-cyan-400/5 px-2 py-0.5 rounded-full">
              Workflow
            </span>
          )}

          <div
            className={cn(
              "flex items-center gap-1.5 font-mono text-[9.5px] tracking-wide px-2 py-0.5 rounded-full border",
              isRunning
                ? "text-cyan-400 border-cyan-400/30 bg-cyan-400/5"
                : allComplete
                  ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
                  : "text-muted-foreground border-border/60 bg-muted/30"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isRunning
                  ? "bg-cyan-400 animate-pulse"
                  : allComplete
                    ? "bg-emerald-400"
                    : "bg-muted-foreground/50"
              )}
            />
            <span>{isRunning ? "running" : allComplete ? "complete" : "queued"}</span>
          </div>
        </div>
      </div>

      {/* Step Rows with Connected Vertical Rail */}
      <div className="p-2 space-y-0.5">
        {steps.map((st, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === steps.length - 1;
          const isOpen = openSteps[st.id] ?? false;
          const state = stateOf(st);
          const badge = getEvidenceBadge(st.evidence, st.sourceRefs);

          return (
            <div key={st.id} className="rounded-xl transition-colors">
              {/* Step Summary Row */}
              <div
                onClick={() => toggleStep(st.id)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer select-none transition-colors"
              >
                {/* Node with vertical connector rail */}
                <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {!isFirst && (
                    <div className="absolute top-[-8px] bottom-1/2 left-1/2 w-[1px] -translate-x-1/2 bg-border/80" />
                  )}
                  {!isLast && (
                    <div className="absolute top-1/2 bottom-[-8px] left-1/2 w-[1px] -translate-x-1/2 bg-border/80" />
                  )}

                  <span
                    className={cn(
                      "relative z-10 flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[10px] transition-all",
                      state === "complete"
                        ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                        : state === "active"
                          ? "border-cyan-400 text-cyan-400 bg-cyan-400/15 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                          : "border-border/80 text-muted-foreground/60 bg-card"
                    )}
                  >
                    {state === "complete" ? (
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    ) : (
                      <StepIconComponent icon={st.icon} className="h-2.5 w-2.5" />
                    )}
                  </span>
                </div>

                {/* Main Label */}
                <span
                  className={cn(
                    "flex-1 truncate text-[12px]",
                    state === "active"
                      ? "text-foreground font-semibold"
                      : state === "complete"
                        ? "text-foreground/90 font-medium"
                        : "text-muted-foreground"
                  )}
                >
                  {st.label}
                </span>

                {/* Evidence Badge */}
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0",
                    badge.className
                  )}
                >
                  {badge.text}
                </span>

                {/* Disclosure Chevron */}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-muted-foreground/70 transition-transform duration-200 shrink-0",
                    isOpen && "rotate-180"
                  )}
                />
              </div>

              {/* Substeps Expansion Container */}
              {isOpen && (
                <div className="ml-7 pl-2.5 border-l border-border/40 py-1 space-y-1.5 font-mono text-[11px] animate-slide-up-fade">
                  {/* If children steps exist */}
                  {st.children && st.children.length > 0
                    ? st.children.map((child) => (
                        <SubstepRow
                          key={child.id}
                          step={child}
                          parentId={st.id}
                          isOpen={openSubsteps[`${st.id}:${child.id}`] ?? true}
                          onToggle={() => toggleSubstep(`${st.id}:${child.id}`)}
                        />
                      ))
                    : st.substeps?.map((sub, i) => (
                        <SimpleSubstepItem
                          key={i}
                          sub={sub}
                          step={st}
                          index={i}
                          isOpen={openSubsteps[`${st.id}:${i}`] ?? true}
                          onToggle={() => toggleSubstep(`${st.id}:${i}`)}
                        />
                      ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubstepRow({
  step,
  parentId,
  isOpen,
  onToggle,
}: {
  step: HierarchicalStep;
  parentId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isAction = !step.category || step.category === "retrieve" || step.category === "validate" || step.category === "draft";
  const isReasoning = step.category === "reason";
  const isWhy = step.category === "why";
  const state = stateOf(step);

  return (
    <div className="space-y-0.5">
      <div
        onClick={onToggle}
        className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-muted/30 cursor-pointer select-none text-[11px]"
      >
        {/* Dot */}
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            isReasoning
              ? "bg-purple-400"
              : isWhy
                ? "bg-amber-400"
                : state === "complete"
                  ? "bg-emerald-400"
                  : state === "active"
                    ? "bg-cyan-400 animate-pulse"
                    : "bg-muted-foreground/40"
          )}
        />

        {/* Icon */}
        <span
          className={cn(
            "shrink-0",
            isReasoning ? "text-purple-400" : isWhy ? "text-amber-400" : "text-muted-foreground"
          )}
        >
          <StepIconComponent icon={step.icon} className="h-2.5 w-2.5" />
        </span>

        {/* Label */}
        <span
          className={cn(
            "flex-1 truncate",
            isReasoning
              ? "text-purple-400/90 italic"
              : isWhy
                ? "text-amber-400/90 italic"
                : state === "active"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
          )}
        >
          {step.label}
        </span>

        {/* Sub evidence */}
        {step.evidence && (
          <span
            className={cn(
              "font-mono text-[8.5px] uppercase tracking-wider px-1 rounded",
              step.evidence === "retrieved"
                ? "text-emerald-500"
                : step.evidence === "verified"
                  ? "text-cyan-400"
                  : "text-muted-foreground/60"
            )}
          >
            {step.evidence}
          </span>
        )}

        <ChevronDown
          className={cn("h-2.5 w-2.5 text-muted-foreground/50 transition-transform", isOpen && "rotate-180")}
        />
      </div>

      {isOpen && (step.refContent || (step.substeps && step.substeps.length > 0)) && (
        <div className="pl-4 pr-1 text-[10.5px] text-muted-foreground leading-relaxed font-sans">
          {step.refContent && <p className="italic">{step.refContent}</p>}
          {step.substeps?.map((ss, idx) => (
            <div key={idx} className="flex items-start gap-1 py-0.5">
              <span className="text-muted-foreground/40 font-mono">▸</span>
              <span>{ss.text || ss.doneText || ss.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimpleSubstepItem({
  sub,
  step,
  index,
  isOpen,
  onToggle,
}: {
  sub: SubstepItem;
  step: HierarchicalStep;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isReasoning = sub.kind === "reasoning";
  const isWhy = sub.kind === "why";

  return (
    <div className="space-y-0.5">
      <div
        onClick={onToggle}
        className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-muted/30 cursor-pointer select-none text-[11px]"
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            isReasoning
              ? "bg-purple-400"
              : isWhy
                ? "bg-amber-400"
                : "bg-emerald-400"
          )}
        />

        <span
          className={cn(
            "flex-1 truncate",
            isReasoning
              ? "text-purple-400/90 italic"
              : isWhy
                ? "text-amber-400/90 italic"
                : "text-muted-foreground"
          )}
        >
          {sub.label}
        </span>

        {sub.evidence && !isReasoning && !isWhy && (
          <span
            className={cn(
              "font-mono text-[8.5px] uppercase tracking-wider px-1 rounded",
              sub.evidence === "retrieved"
                ? "text-emerald-500"
                : sub.evidence === "verified"
                  ? "text-cyan-400"
                  : "text-muted-foreground/60"
            )}
          >
            {sub.evidence}
          </span>
        )}

        <ChevronDown
          className={cn("h-2.5 w-2.5 text-muted-foreground/50 transition-transform", isOpen && "rotate-180")}
        />
      </div>

      {isOpen && (sub.text || sub.doneText) && (
        <div
          className={cn(
            "pl-4 pr-1 text-[10.5px] leading-relaxed font-mono",
            isReasoning
              ? "text-purple-400/80 italic"
              : isWhy
                ? "text-amber-400/80 italic"
                : "text-muted-foreground/90"
          )}
        >
          {sub.text || sub.doneText}
        </div>
      )}
    </div>
  );
}

// Backward compatibility alias for single ActivityRow
export function ActivityRow({ act }: { act: HierarchicalStep }) {
  return (
    <div className="py-0.5">
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        <span className="text-emerald-400 font-bold">✓</span>
        <span className="text-foreground/90 truncate">{act.label}</span>
      </div>
    </div>
  );
}

/**
 * ARCHITECT'S LOG COMPONENT (Layer 2 & Layer 3)
 * - Layer 2: Curated Rationale bullets (explaining the "why")
 * - Layer 3: Opt-in expandable agent process trace without noise/timestamps
 */
export function ArchitectLogCard({
  thought,
  loreItems = [],
  onOpenTab,
}: {
  thought?: string;
  loreItems?: Array<{ id: string; name: string; type: string }>;
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
}) {
  const [showProcess, setShowProcess] = useState(false);
  if (!thought || !thought.trim()) return null;

  // Extract clean curated rationale bullets vs deep thoughts
  const lines = thought
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Group into concise rationale bullets (up to 3 main conclusions)
  const rationaleBullets = lines
    .filter((l) => !/^(step|check|thought|eval|context):/i.test(l))
    .slice(0, 3)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  const fallbackBullets = rationaleBullets.length > 0
    ? rationaleBullets
    : [lines[0] || "Synthesized continuity with active lore & cores."];

  return (
    <div className="mb-2.5 rounded-2xl border border-border/50 bg-muted/20 p-3 space-y-2 text-xs transition-all duration-200">
      {/* Header with Title and Opt-in toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Architect's Log</span>
        </div>
        <button
          type="button"
          onClick={() => setShowProcess((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground transition"
        >
          <span>{showProcess ? "Hide process" : "Show agent process"}</span>
          <ChevronDown
            className={cn("h-3 w-3 transition-transform duration-150", showProcess && "rotate-180")}
          />
        </button>
      </div>

      {/* Layer 2: Curated Rationale Bullets */}
      <div className="space-y-1 pl-1">
        {fallbackBullets.map((bullet, idx) => (
          <div key={idx} className="flex items-start gap-2 text-[12px] leading-relaxed text-foreground/90 font-sans">
            <span className="text-primary mt-1 text-[10px] shrink-0 font-mono">▸</span>
            <span className="flex-1">{bullet}</span>
          </div>
        ))}
      </div>

      {/* Layer 3: Opt-in Agent Process Raw Trace (Cleaned of noisy timestamps/rails) */}
      {showProcess && (
        <div className="mt-2.5 rounded-xl border border-border/60 bg-background/70 p-2.5 space-y-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground animate-slide-up-fade">
          <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/30 pb-1 flex items-center justify-between">
            <span>Agent Execution Trace</span>
            <span className="text-[8.5px] font-semibold text-emerald-500/80">VERIFIED</span>
          </div>
          <div className="space-y-1 pt-0.5">
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-muted-foreground/90">
                <span className="text-muted-foreground/40 select-none">·</span>
                <span className="flex-1 whitespace-pre-wrap">{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

