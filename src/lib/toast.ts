import { toast as sonner } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { createElement } from "react";

/** Shared success toast — always shows a green ✅ check icon. */
export function toastSuccess(message: string, description?: string) {
  return sonner.success(message, {
    description,
    icon: createElement(CheckCircle2, {
      className: "h-4 w-4 text-emerald-500",
      strokeWidth: 2.5,
    }),
  });
}

export const toastError = (msg: string, description?: string) =>
  sonner.error(msg, { description });

export const toastInfo = (msg: string, description?: string) =>
  sonner(msg, { description });

/**
 * Robust clipboard copy — falls back to a hidden textarea + execCommand when
 * navigator.clipboard is unavailable (insecure context, older mobile browsers).
 * Shows a green success toast automatically.
 */
export async function copyText(
  text: string,
  successMsg: string = "Copied to clipboard",
): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toastSuccess(successMsg);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        toastSuccess(successMsg);
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  toastError("Couldn't access clipboard");
  return false;
}
