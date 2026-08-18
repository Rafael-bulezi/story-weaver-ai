// Stub — Lovable error reporting removed.
// Errors are logged to the browser console only.
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[Story Canvas Error]", error, context);
}
