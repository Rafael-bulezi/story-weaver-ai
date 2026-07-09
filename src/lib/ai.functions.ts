import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InvokeInput = z.object({
  mode: z.enum([
    "writer",
    "critic",
    "debater",
    "chat",
    "extract",
    "categorize",
    "suggest_fix",
    "cores_ask",
    "rewrite",
  ]),
  action: z.string(),
  context: z.string(),
  userPrompt: z.string().optional().default(""),
});

const SYSTEM_BASE = `You are a story development assistant for a fiction workspace called Story Canvas.
You always maintain continuity with the provided WORLD CORES (canonical facts) and LORE.
Respond ONLY with the requested content — no preambles like "Sure" or "Here is".`;

const MODE_PROMPT: Record<string, string> = {
  writer:
    "MODE: Writer. Expand or continue the scene with vivid sensory language, staying in the established tone. Keep it 2–4 short paragraphs unless asked otherwise.",
  critic:
    "MODE: Critic. Read the material and surface 2–4 concrete issues: plot holes, unclear motivation, continuity gaps, thin worldbuilding. Bullet points. Be direct.",
  debater:
    "MODE: Debater. Propose 2–3 bold alternate directions — each in one sentence, then one sentence on why it would work.",
  chat: `MODE: Brainstorm. You are the user's creative writing partner with full memory of the book's Cores, Lore, and recent brainstorm history.

Behave like a fluent conversational assistant (like ChatGPT). No forced bullet lists, no forced length. Match the user's requested length EXACTLY — if they say "in 2 lines", give 2 lines; if they ask for a full breakdown, give a full breakdown.

When the user asks you to CREATE something (a character, plot beat, place, twist), briefly explain WHY you're designing it that way (motivation, thematic fit, connection to existing cores/lore) BEFORE presenting the design itself. Keep the reasoning natural and proportional — one to three sentences usually.

Stay grounded in the provided cores/lore. Use markdown when it helps readability.`,
  extract:
    "MODE: Lore Extractor. Read the material and extract new characters, places, or concepts worth adding to the world lore. Return ONLY a bulleted list, one per line, in this exact format:\nTYPE — NAME — one-line description\nWhere TYPE is one of: CHARACTER, PLACE, CONCEPT. No preamble.",
  categorize:
    "MODE: Categorizer. Given a piece of brainstorm output, return a short 3–6 word topic title suitable as a Core title (Title Case, no punctuation). Return ONLY the title, nothing else.",
  suggest_fix:
    "MODE: Fix Suggester. Given a critic note, propose 3 concrete, distinct fix options. Return ONLY a bulleted list, one option per line, each 1–2 sentences. No preamble.",
  cores_ask:
    "MODE: Cores Librarian. Answer the user's question using ONLY the provided WORLD CORES. Be brief and factual. At the end, on a new line, output: SOURCES: <comma-separated core numbers you used, e.g. 1, 3>. If none apply, say so and output SOURCES: none.",
  rewrite:
    "MODE: Rewriter. Take the given last user message and last assistant reply, and produce a STRONGER rewritten version of the assistant reply — sharper prose, tighter reasoning, better continuity with the cores/lore. Match the original's approximate length. Return ONLY the rewritten reply.",
};

export const invokeAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InvokeInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const userMsg = `${data.context}\n\n---\n\nUSER REQUEST:\n${data.action}${data.userPrompt ? `\n\nADDITIONAL:\n${data.userPrompt}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${SYSTEM_BASE}\n\n${MODE_PROMPT[data.mode]}` },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429)
        throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (res.status === 402)
        throw new Error("AI credits exhausted for this workspace. Please add credits to continue.");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content };
  });
