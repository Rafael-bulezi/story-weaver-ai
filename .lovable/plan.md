# Story Canvas — UX Revamp Plan

Scope: light theme stays. Colors unchanged. Focus is UX + interaction + one new tab.

## 1. Lore "+" menu polish
- Fix visual overlap: floating `+` currently sits centered on the 4-tab nav row, overlapping the Lore icon. Move it **above** the nav row (translate further up: `-translate-y-9`) and shrink to 44px.
- Smooth blur backdrop: `backdrop-blur-md bg-black/25` with `animate-in fade-in duration-200`.
- Icon menu (Character / Place / Concept / Generate Image): slide **down** from the + with staggered `translate-y` + opacity, `cubic-bezier(0.22, 1, 0.36, 1)`, 180ms, 40ms stagger per item.
- Dismiss on: outside tap, Escape, tab switch (close in a `useEffect` on tab change).

## 2. Cores "+" menu (mirrors Lore)
Replace the current inline `+ New` with a floating `+` (same component). Two options in a blurred popover:
- **Add Core** (creates numbered core, inline edit title)
- **Attach File** (file input → stored as base64 dataURL on a new `CoreAttachment { id, name, mime, dataUrl }[]` on the Core). Renders as a chip under the core title; tap to open in new tab.

Same animation system as Lore.

## 3. New 5th nav tab: **Studio**
Bottom nav becomes 5 icons: `Chat · Brainstorm · Lore · Cores · Studio`.
- Studio = creative-hub dashboard for the current book:
  - Big "Continue Writing" card → jumps to Chat.
  - Stat tiles: Chapters count, Lore count, Cores count, Words.
  - Recent chapters list (tap → loads into Chat as current title/content? No — read-only preview + "Open in Chat" button which sets active chapter).
- Icon: `Sparkle` or `LayoutDashboard` (lucide).
- Keep icon-only with tiny label; grid becomes `grid-cols-5`.

## 4. Chapters tab (top-right, adjacent to book icon in Chat header)
Not a bottom-nav tab — a **header sheet** launched from a `BookMarked` icon top-right in the Chat header (next to existing sidebar trigger).
- Opens right-side Sheet: two sections **Canon** and **Drafts**.
- Draft row: title, timestamp, `Edit` (loads into Chat as active), `Move → Canon` (arrow-up icon), `Delete` (trash, with confirm dialog).
- Canon row: title, timestamp, `Edit` (loads into Chat), `Move → Draft` (arrow-down). **No delete.**
- Confirmation: shadcn `AlertDialog` for draft delete.
- Requires store additions: `promoteToCanon(id)`, `demoteToDraft(id)`, `deleteDraft(id)`, `loadChapterIntoActive(id)`.

## 5. Brainstorm rewrite — fluid ChatGPT-style
Current system prompt forces 2–3 bullets and terseness. Change:
- **Chat mode (Brainstorm default)**: remove forced-bullets rule. New prompt: "You are the user's creative writing partner with full memory of their book's Cores and Lore. Answer conversationally, matching the user's requested length precisely. When the user asks for something (e.g. 'create an antagonist'), explain your reasoning briefly *why* you designed it that way, then the design itself. If they ask for N lines, give exactly N."
- Keep Critic + Debater modes as-is (they're already working).
- Add third pill: **Rewrite** — takes the last user↔assistant pair and produces a stronger version of the assistant's reply.
- Memory: full brainstorm history sent (already trimmed with rolling tail) + `buildBookContext` with condensed cores/lore, no full chapter unless "Include chapter" toggled.

## 6. Context strip (`Using: <Overview> <Zeal> +`)
Above every AI composer (Chat AI actions, Brainstorm, Cores Ask):
```
Using:  [◆ Overview]  [Zeal]  [Nyra]  [+]
```
- Chips are removable (× on hover). Tap `+` opens a sheet: "Add to context" listing all Cores, Characters, Places, Concepts.
- **First chip is always `Overview`** = auto-generated one-paragraph digest of all cores (built by `buildOverview(book)` — first line of each core concatenated, capped ~400 chars). Non-removable.
- Selected chip IDs stored per-tab in component state (not persisted for MVP).
- Prompt builder uses selected chips instead of dumping all cores/lore when chips are present. If only Overview, sends the digest.

## 7. Composer redesign (inspired by uploaded darks)
For Brainstorm + Cores Ask:
```
[+]  [ Ask anything… __________________ ]  [ ⋯→ ]  [ @ ]  [ ↑ ]
```
- `+`: opens the same "Add to context" sheet (equivalent to chip strip's +).
- `@`: quick-mention picker (jump to a specific lore/core entity, inserts `@Name` token into input).
- `↑`: send.
- `⋯`: replace the three-dots with `SlidersHorizontal` (lucide) — opens a small menu for mode toggles (Include chapter, temperature preset, etc.). Just a placeholder menu for now with `Include chapter text` switch.

## 8. Animations
Consolidate into `src/styles.css` utility classes:
- `.animate-slide-up-fade` (14px, 200ms, cubic-bezier(0.22,1,0.36,1))
- `.animate-slide-down-fade`
- Backdrop `.animate-blur-in` (backdrop-blur 0 → 8px, 180ms)
- Stagger via `style={{ animationDelay: `${i*40}ms` }}`.
Apply to Lore +, Cores +, sheets, chapter drawer open.

## 9. Lore & Cores light revamp
- Lore: cards get subtle hover lift (`transition-shadow`, shadow-sm→shadow-md), rounded-2xl, image thumbnails 44×44 with `object-cover`.
- Cores: card headers get numbered chip `◆ 1`, subcards indent with a left-border, subcard bullets show `1.1`, `1.2` inline. Add file-chip row below title.

## 10. Data model additions (`story-store.ts`, still `sc:books:v4` — additive)
- `Core.attachments?: CoreAttachment[]`
- `CoreAttachment { id, name, mime, dataUrl, createdAt }`
- Store fns: `addCoreAttachment(bookId, coreId, file)`, `removeCoreAttachment(...)`, `promoteChapter(id)`, `demoteChapter(id)`, `deleteChapter(id)`, `loadChapter(id)`, `buildOverview(book)`.

## 11. Files touched / added
```
NEW  src/components/story/StudioTab.tsx
NEW  src/components/story/ChaptersSheet.tsx
NEW  src/components/story/ContextStrip.tsx
NEW  src/components/story/AiComposer.tsx (shared composer)
NEW  src/components/story/FloatingAddMenu.tsx (generic version — Lore + Cores share)
EDIT src/components/story/BottomNav.tsx (5 cols)
EDIT src/components/story/LoreTab.tsx (use FloatingAddMenu, revamp cards)
EDIT src/components/story/CoresTab.tsx (FloatingAddMenu, attachments, ContextStrip on Ask)
EDIT src/components/story/BrainstormTab.tsx (ContextStrip, AiComposer, Rewrite pill, fluid replies)
EDIT src/components/story/ChatTab.tsx (Chapters sheet trigger in header)
EDIT src/lib/story-store.ts (types + fns + overview builder)
EDIT src/lib/ai.functions.ts (relaxed brainstorm prompt, add "rewrite" mode)
EDIT src/routes/index.tsx (5-tab switch, add "studio", pass editorRef)
EDIT src/styles.css (animation utilities)
```

## 12. Out of scope this pass
- Cloud sync / cross-device.
- Real file parsing for attached files (just stored + downloadable).
- @-mention autocomplete (button opens sheet only).
- Persisting selected context chips.

## Verify after build
1. Lore `+` sits above nav, no overlap; opens with blur + slide-down icons; closes on outside tap and on tab change.
2. Cores `+` shows 2 options; Attach File stores + shows chip.
3. Studio tab appears as 5th nav item, shows stats + recent chapters + continue writing.
4. Chat header shows book icon (chapters); opens sheet with canon/drafts; move works both ways; draft delete asks confirmation; canon has no delete.
5. Brainstorm: "give me a 2 line explanation of X" returns ~2 lines; "create an antagonist" returns prose with reasoning; Rewrite pill improves last assistant reply.
6. Context strip renders on Brainstorm + Cores Ask; Overview chip non-removable; adding chips restricts prompt context.
7. Composer uses `+ / @ / ⋯ / ↑` layout; `⋯` uses `SlidersHorizontal` not three dots.
