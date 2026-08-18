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
    <div className="relative z-30 border-t border-border/70 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2 px-3 py-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              aria-label={label}
              onClick={() => onChange(id)}
              className={cn(
                "group flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition-all active:scale-95",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
              )}
            >
              <span className="text-[12.5px] font-medium tracking-tight">
                {label}
              </span>
              <Icon className="h-4 w-4 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
