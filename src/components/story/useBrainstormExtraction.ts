import { invokeAssistant } from "@/lib/ai.functions";
import { findSimilarLore, type BooksApi } from "@/lib/story-store";
import { toastSuccess } from "@/lib/toast";

export function useBrainstormExtraction(books: BooksApi) {
  const active = books.active!;

  async function silentExtractLore(responseText: string) {
    if ((active.candidates ?? []).length >= 3) return;
    const existingNames = new Set([
      ...(active.lore ?? []).map((l) => l.name.trim().toLowerCase()),
      ...(active.candidates ?? []).map((c) => c.name.trim().toLowerCase()),
    ]);
    try {
      const excerpt = responseText.slice(0, 1200).trim();
      const { content } = await invokeAssistant({
        data: {
          mode: "extract",
          action: "Extract AT MOST 2 named story-world entities (character, place, concept, faction). Output format: TYPE — NAME — description",
          context: `EXISTING LORE:\n${(active.lore ?? []).map((l) => `- ${l.name} (${l.type})`).join("\n") || "(none)"}\n\nTEXT:\n${excerpt}`,
        },
      });
      if (!content || /^none$/i.test(content.trim())) return;
      const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines.slice(0, 2)) {
        if (/^none$/i.test(line)) continue;
        const parts = line.replace(/^[-*•\d.)\s]+/, "").split(/\s*[—\-|:]\s*/);
        if (parts.length < 2) continue;
        const rawType = (parts[0] || "").toLowerCase();
        let type: "character" | "place" | "concept" | "faction" = "concept";
        if (/char|person|protagonist|npc/.test(rawType)) type = "character";
        else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
        else if (/faction|group|org|council|order|guild|house|chamber|clan|tribe/.test(rawType)) type = "faction";
        const name = (parts[1] || "").trim();
        if (!name || existingNames.has(name.toLowerCase())) continue;
        const desc = parts.slice(2).join(" — ").trim() || line;
        const candidate = { id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, type, name, description: desc };
        const match = findSimilarLore(candidate, active.lore ?? [], 0.85);
        if (match) {
          books.addLorePending({ candidate, existingId: match.item.id, similarity: match.similarity, confidence: 1 - match.similarity });
        } else {
          books.addCandidate(candidate);
          existingNames.add(name.toLowerCase());
        }
      }
    } catch { /* best-effort */ }
  }

  function detectGoalsAndAdd(responseText: string) {
    const foundGoals: string[] = [];
    const regexBold = /\*\*(?:Core|Subtopic)\s*\d+(?:\.\d+)*:\s*([^*]+?)\*\*/gi;
    let m;
    while ((m = regexBold.exec(responseText)) !== null) {
      if (m[1]) foundGoals.push(m[1].trim());
    }
    const uniqueGoals = Array.from(new Set(foundGoals)).filter(Boolean);
    uniqueGoals.forEach((goalTitle) => {
      const exists = (active.goals ?? []).some((g) => g.title.toLowerCase() === goalTitle.toLowerCase());
      if (!exists) books.addGoal(goalTitle, { source: "ai", status: "suggested" });
    });
    if (uniqueGoals.length > 0) toastSuccess(`🎯 ${uniqueGoals.length} goal${uniqueGoals.length > 1 ? "s" : ""} detected`);
  }

  async function generateRecommendations(messageId: string, responseText: string) {
    try {
      const { content } = await invokeAssistant({
        data: {
          mode: "categorize",
          action: "Suggest EXACTLY 3 tiny next topics (max 10 words each). Return ONLY the 3 lines, one per line.",
          context: `REPLY:\n${responseText.slice(0, 1200)}`,
        },
      });
      const lines = content.split(/\n+/).map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 3);
      if (lines.length > 0) books.updateBrainstorm(messageId, { recommendations: lines });
    } catch { /* best-effort */ }
  }

  async function insertAsLore(text: string) {
    try {
      const { content } = await invokeAssistant({
        data: {
          mode: "extract",
          action: "Extract a single named entity: TYPE — NAME — description",
          context: `TEXT:\n${text}`,
        },
      });
      const parts = content.split("—").map((p) => p.trim());
      const rawType = (parts[0] || "").toLowerCase();
      let type: "character" | "place" | "concept" | "faction" = "concept";
      if (/char|person|protagonist|npc/.test(rawType)) type = "character";
      else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
      else if (/faction|group|org|council|order|guild|house|chamber|clan|tribe/.test(rawType)) type = "faction";
      const name = parts[1] || "Extracted Lore";
      const desc = parts.slice(2).join(" — ").trim() || text.trim();
      const exactMatch = (active.lore ?? []).some((l) => l.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (exactMatch) {
        toastSuccess(`"${name}" is already in your Lore.`);
        return;
      }
      const candidate = { id: `l${Date.now()}`, type, name, description: desc };
      const match = findSimilarLore(candidate, active.lore ?? [], 0.85);
      if (match) {
        toastSuccess(`Similar lore exists — "${match.item.name}" already covers this.`);
      } else {
        books.addLore({ type, name, description: desc });
        toastSuccess(`Added to Lore: ${name} (${type})`);
      }
    } catch {
      books.addLore({ type: "concept", name: "Extracted Item", description: text.trim() });
      toastSuccess("Added to Lore as a concept");
    }
  }

  async function autoNameBranch(branchId: string, originContent: string) {
    try {
      const excerpt = originContent.slice(0, 400).trim();
      const { content } = await invokeAssistant({
        data: {
          mode: "categorize",
          action: "Create a short branch name (3–5 words). Return ONLY the name.",
          context: `ORIGIN MESSAGE:\n${excerpt}`,
        },
      });
      const cleaned = content.trim().replace(/^["\'`]|["\'`]$/g, "").replace(/\.$/, "").slice(0, 55);
      if (cleaned) books.renameBranch(branchId, cleaned);
    } catch { /* best-effort */ }
  }

  return {
    silentExtractLore,
    detectGoalsAndAdd,
    generateRecommendations,
    insertAsLore,
    autoNameBranch,
  };
}
