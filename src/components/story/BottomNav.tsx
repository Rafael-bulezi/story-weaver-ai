import { Feather, Sparkles, BookOpen, Layers, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "chat" | "brainstorm" | "lore" | "cores" | "studio";

const NAV: { id: NavTab; label: string; icon: typeof Feather }[] = [
  { id: "chat", label: "Write", icon: Feather },
  { id: "brainstorm", label: "Brainstorm", icon: Sparkles },
  { id: "lore", label: "Lore", icon: BookOpen },
  { id: "cores", label: "Cores", icon: Layers },
  { id: "studio", label: "Studio", icon: LayoutDashboard },
];

export function BottomNav({ tab, onChange }: { tab: NavTab; onChange: (t: NavTab) => void }) {
  return (
    <div className="relative z-30 border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 gap-1 px-1 py-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              aria-label={label}
              onClick={() => onChange(id)}
              className={cn(
                "group flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition active:scale-95",
                active
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
