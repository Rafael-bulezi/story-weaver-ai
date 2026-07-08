
# Story Canvas — Structural refactor plan

## 1. Navigation model
Replace the current `Write / World / Chapter` tabs with **4 icon-only** bottom nav buttons, present on every page:

```text
                        [ + ]        ← contextual add (Lore tab only)
[ ✍ Chat ]  [ 💡 Brainstorm ]  [ 📖 Lore ]  [ ◇ Cores ]
```

- Rename `Writer` → `Chat` in labels (tooltip only, icon-first).
- Remove the "World" tab — it's redundant with Lore.
- Remove the separate `Chapter` tab; chapter title lives inside Chat header (see §7).
- Each tab renders its own **secondary action row** ABOVE the nav (not more pills at the bottom):
  - **Chat tab:** `[ Extract Lore ]   [ Save Chapter ]`
  - **Brainstorm tab:** `[ Critic ]   [ Debater ]` (contextual, feed off the current brainstorm chat)
  - **Lore tab:** floating `+` above nav center → opens add-menu (Character / Place / Concept / Generate Image) with a soft backdrop blur; tap outside dismisses.
  - **Cores tab:** `[ + New ] [ Ask anything… ______________ ]` composer row.

## 2. Chat tab (was Writer)
- The main writing canvas (serif prose editor) stays.
- Header shows **chapter title** (editable), not book title. Book title is edited only in Sidebar / Library.
- Bottom actions: `Extract Lore`, `Save Chapter` (both keep current behavior; extracted items auto-route into Characters/Places/Concepts via existing `importExtractedLore`).

## 3. Brainstorm tab (new dedicated page)
- Full chat surface with the AI — this is where you brainstorm the story.
- Two secondary pills **Critic** and **Debater** operate on the current brainstorm chat context (not on the chapter text), so the main story canvas stays clean.
- Every assistant message card gets:
  - `×` close/delete button (top-right)
  - `Copy` (unchanged clipboard)
  - `Append` → inserts text into the Chat/Writer canvas **at cursor position, moving forward** (needs a cursor-position ref stored from the Chat tab's textarea).
  - `Insert → Core` → the AI categorizes the response, creates a **new Core** numbered `last + 1`, titled from the topic.
- **Critic cards additionally get "Suggest Fix"**:
  - Opens a panel listing 2–4 concrete fix options (AI-generated).
  - Each option has an "Add to…" dropdown listing all cores; selecting a core reveals two choices:
    - `Add as new sub-card` → appended as `N.(last+1) > <title>`
    - `Add as new Core` → creates Core `last+1`
- Brainstorm messages are kept in memory per-book but only a **short rolling window** is fed back into prompts (see §6).

## 4. Lore tab
- Keep current Characters / Places / Concepts groups with in-place edit.
- Add **image** field to `LoreItem` (`imageUrl?: string`).
  - Small thumbnail beside the item name; tap to view full.
  - Each item edit form gets `Attach image` (file → base64/dataURL in localStorage) and `Generate image` (calls Lovable AI image gen with a prompt seeded from name+description).
- Remove any inline Critic/Extract/Back buttons from this tab — only the 4 nav + the floating `+`.
- Floating `+` above center of nav opens a blurred-backdrop popover with 4 buttons: Character, Place, Concept, Generate Image.

## 5. Cores tab (promoted to its own page)
- Numbered display:
  ```text
  ◇ Core 1 — State of the World
     1.1  Era
     1.2  Technology
  ◇ Core 2 — Magic System
     2.1  …
  ```
- Numbering is derived from array position (not persisted), so reordering later is trivial.
- Bottom composer: `[+ New]  [ Ask anything… ]`
  - `New` creates a Core (title inline-editable).
  - `Ask` sends the question to AI with **all cores** as context; response appears above with a "Sources" footer listing which cores were referenced.
- Existing per-core edit / add-block controls remain (styled to match numbering).

## 6. Context / memory system
Central builder `buildBookContext(book, { includeChapterText, brainstormTail })`:
- Always includes: book title, chapter title, **all cores** (highest priority), condensed lore (name + one-line desc).
- Chat tab requests → include full current chapter text.
- Brainstorm requests → include only the **last N (default 8)** brainstorm messages + condensed cores + condensed lore, NOT the full chapter text unless the user pill "Include chapter" is toggled (small toggle beside Critic/Debater).
- Cores "Ask anything" → cores only, no chapter, no lore, no chat history.
- Extract Lore / Save Chapter unchanged.

## 7. Data model additions (`story-store.ts`)
- `LoreItem`: add `imageUrl?: string`.
- `Book`: add `brainstorm: BrainstormMessage[]` where `BrainstormMessage = { id, role: 'user'|'assistant', mode?: 'chat'|'critic'|'debater', content, createdAt }`.
- `Chapter` unchanged; chapter title editing now writes to `active.title` for the active in-progress chapter (or, if we split book vs chapter titles, add `book.name` distinct from chapter — see §8).
- Migrate store key to `sc:books:v4` with a one-time migrator that fills defaults.

## 8. Book vs chapter title separation
- Add `Book.name` (book title, edited in Sidebar/Library).
- Keep `Book.title` as the **current chapter title** (edited in Chat header) OR rename fields for clarity: `book.name` + `book.currentChapterTitle`. Migrator maps old `title` → `name` and seeds `currentChapterTitle` from subtitle.

## 9. File split (files are getting large)
Break `src/routes/index.tsx` and `src/lib/story-store.ts` into:
```
src/lib/
  store/
    books.ts              (Book CRUD + persistence)
    lore.ts               (lore ops + importExtracted)
    chapters.ts           (chapter ops)
    cores.ts              (cores ops + numbering helpers)
    brainstorm.ts         (brainstorm history ops)
    context.ts            (buildBookContext, loreToPrompt, coresToPrompt)
    types.ts              (all shared types)
    index.ts              (re-exports + useBooks hook)
  ai/
    ai.functions.ts       (existing invokeAssistant, updated system prompts)
    image.functions.ts    (new: generate lore image via Lovable AI image gen)
src/components/story/
  BottomNav.tsx           (4 icon nav + optional floating +)
  ChatTab.tsx
  BrainstormTab.tsx
    MessageCard.tsx       (× delete, copy, append, insert→core, suggest-fix)
    SuggestFixPanel.tsx
  LoreTab.tsx
    LoreItemCard.tsx
    LoreImagePicker.tsx
    AddLorePopover.tsx    (blurred backdrop + icon menu)
  CoresTab.tsx
    CoreCard.tsx
    CoresAskBar.tsx
  Sidebar.tsx             (library + settings, book-title edit)
src/routes/index.tsx      (thin shell: sidebar + active tab + BottomNav)
```

## 10. Small UX polish
- Icon-only pills (lucide) with `aria-label`; tooltip on hover for desktop.
- Floating `+` uses `backdrop-blur-sm bg-black/20` overlay; tap-away dismisses; icons slide up with a short transform/opacity transition.
- Assistant message `×` on hover (always visible on mobile).
- Chapter title input: single-line, no book-title confusion; helper text "Book title: edit in sidebar".

## 11. Out of scope for this pass
- Cloud sync / Supabase.
- Streaming responses.
- Reordering cores via drag-drop (numbering is positional; reorder UI can come later).

## Verification steps after build
1. All 4 nav buttons visible on every tab; no legacy World/Chapter tabs.
2. Chat: extract & save chapter work; chapter title edits do not rename book.
3. Brainstorm: send message → get reply → × removes it; append inserts at cursor in Chat; insert→core creates numbered core; Critic → Suggest Fix opens options → add to specific core/subcard writes correctly.
4. Lore: add via floating +, attach image, generate image via AI, thumbnails render.
5. Cores: numbered display, Ask returns answer with source cores listed.
6. Context: brainstorm prompt payload contains cores + lore + tail messages, not full chapter, unless toggled.
