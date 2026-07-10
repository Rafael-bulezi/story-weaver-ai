# StoryWeave — Phased Revamp Plan

This is a very large request. To keep quality high and avoid nuking the current UI/theme, I'll split it into 4 phases. **Phase 1 ships this turn on your approval.** Later phases wait for your go-ahead so we can review after each.

---

## Phase 1 — Quick wins (ship immediately)

Small, high-visibility fixes you called out directly.

1. **Copy button actually works** — wire it to `navigator.clipboard.writeText`, plus a green ✅ toast.
2. **Green ✅ toasts everywhere** — override `sonner` defaults so success toasts show a green check icon instead of the white one.
3. **`×` on Critic / Debater / Suggest-Fix cards in Brainstorm** — one-click ruthless delete.
4. **Cores tab `+` overlap fix** — move the floating `+` out of the composer; add it as a small icon-button on the composer left, next to the send button on the right stays. No more overlap.
5. **Search icon in Cores header** (top, adjacent to the "Canonical facts…" subtitle) — filters cores by title/fact text live.
6. **Search in Lore tab header** — same pattern, filters characters/places/concepts.
7. **Search inside "Add to context" sheet** — filter the picker list.
8. **Move `@` mention trigger to sit next to `⋯ ↑`** in the Brainstorm composer (per your note).
9. **Extract-Lore from a Core / Sub-Core** — add a small "Send to Lore" action on core cards that categorises the fact into Character / Place / Concept via the existing extractor.

## Phase 2 — Studio revamp + Overview/Context viewer

10. **Studio homepage redesign** — inspired by image 3 (light-theme version): big hero card at top (title + Continue Writing arrow) — *only that first block styled like the reference*; the four stat tiles stay as they are.
11. **Clickable context chips** — tapping `Overview` or any chip in the `Using:` strip opens a viewer sheet showing exactly what content is being sent to the AI. Overview is editable (persisted per book); lore/core chips are read-only previews with an "Open in tab" button.
12. **Core "expand" icon** → opens the core in a full lightbox for focused reading/editing.
13. **Core "collapse names only" toggle** in the Cores header — shows just numbered titles for fast scanning.
14. **Sub-core cap: 4 visible max** — extras collapse into a "Show N more" row.

## Phase 3 — Settings page + dual-model architecture

15. New **Settings route** (`/settings`) with sections: Appearance (theme/accent/font/size), AI Models (Large + Small "Architect" pickers using existing gateway models), AI Behavior (response length, creativity slider), Memory, Branching, Knowledge Base, Import/Export.
16. **Small/Architect model** wired for lightweight tasks: core auto-naming, lore extraction, file digestion, divergence detection. **Large model** stays for Writer/Critic/Debater/Rewrite/Suggest-Fix.
17. **Slim inline notification strip** at end of assistant messages (below Append/Copy/Suggest-Fix row) for Divergence / Contradiction / Path suggestions — light-theme, one-line, dismissible. Inspired *only* by the layout of image 2's warning strips (not the dark colors).
18. **Persist selected context chips** per tab in localStorage.

## Phase 4 — Bigger architecture (needs its own discussion first)

These are significant and I'd rather scope each with you before building:

- Cloud sync / cross-device (requires enabling Lovable Cloud — auth + schema design).
- Real file parsing for Core attachments (chunking + embeddings; needs vector storage decision).
- `@`-mention autocomplete dropdown with live filter in Brainstorm composer.
- Seamless invisible branching (auto-fork on "what if…", auto-name, auto-return-to-main) — this is a design-heavy feature; I'll draft a UX spec before coding.
- Sidebar restructure (Projects / Recent / Bookmarks / Artifacts / Search / Settings) and moving Topics inside a project — this touches every tab's chrome; deserves its own pass.
- Cost dashboard.

---

## Technical notes (skip if not interested)

- New shared `Toast` wrapper in `src/lib/toast.ts` calling `sonner` with a green `CheckCircle2` icon by default.
- Phase 1 touches: `BrainstormTab.tsx`, `CoresTab.tsx`, `LoreTab.tsx`, `ContextStrip.tsx`, `story-store.ts` (add `overview` field + `searchCores`/`searchLore` helpers if needed — mostly filtered in-component).
- Phase 2 adds: `OverviewSheet.tsx`, `CoreLightbox.tsx`, new store field `Book.overview?: string`.
- Phase 3 adds: `src/routes/settings.tsx`, `src/lib/settings-store.ts` (localStorage), `src/lib/ai.functions.ts` gains a `modelSize: "large" | "small"` param routing to `openai/gpt-5.5` vs `google/gemini-3.1-flash-lite`.
- Keep current light theme, colors, and layout language throughout. No visual reset.

---

**Reply "go phase 1"** (or just "go") and I'll ship Phase 1 immediately. Say "also phase 2" to bundle. Phase 3 and 4 I'd like to confirm scope on before starting.