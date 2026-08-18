import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FloatingAddOption {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

/**
 * Self-contained floating "+" button pinned above the bottom nav.
 * Shows a blurred backdrop and slide-down animated icon options.
 * Auto-dismisses on outside tap and on Escape.
 */
export function FloatingAddMenu({
  open,
  onOpenChange,
  options,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  options: FloatingAddOption[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div
          onClick={() => onOpenChange(false)}
          className="animate-soft-fade-in fixed inset-0 z-40 bg-black/25 backdrop-blur-md"
          aria-hidden
        />
      )}
      {/* option pills — appear ABOVE the + button so they slide down toward it */}
      {open && (
        <div className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex justify-center">
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto grid grid-cols-2 gap-2.5 rounded-2xl bg-card p-2.5 shadow-xl border border-border/60"
            style={{ minWidth: 220 }}
          >
            {options.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onOpenChange(false);
                    opt.onClick();
                  }}
                  className="animate-slide-down-fade flex flex-col items-center gap-1.5 rounded-xl p-3 text-center active:scale-95"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight text-card-foreground">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-[82px] z-50 flex justify-center">
        <button
          onClick={() => onOpenChange(!open)}
          aria-label={open ? "Close menu" : "Add"}
          className={cn(
            "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 active:scale-90",
            open && "rotate-45",
          )}
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}
