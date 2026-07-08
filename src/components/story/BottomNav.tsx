import { Feather, Sparkles, BookOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "chat" | "brainstorm" | "lore" | "cores";

const NAV: { id: NavTab; label: string; icon: typeof Feather }[] = [
  { id: "chat", label: "Chat", icon: Feather },
  { id: "brainstorm", label: "Brainstorm", icon: Sparkles },
  { id: "lore", label: "Lore", icon: BookOpen },
  { id: "cores", label: "Cores", icon: Layers },
];

export function BottomNav({
  tab,
  onChange,
  centerSlot,
}: {
  tab: NavTab;
  onChange: (t: NavTab) => void;
  centerSlot?: React.ReactNode;
}) {
  return (
    <div className="relative border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
      {centerSlot && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto">{centerSlot}</div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              aria-label={label}
              onClick={() => onChange(id)}
              className={cn(
                "group flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition active:scale-95",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-5 w-5" />
              <span
                className={cn("text-[10px] font-medium", active ? "opacity-100" : "opacity-70")}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
