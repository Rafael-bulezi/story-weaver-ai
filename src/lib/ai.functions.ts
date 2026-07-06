import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InvokeInput = z.object({
  mode: z.enum(["writer", "critic", "debater", "chat"]),
  action: z.string(),
  story: z.string(),
  lore: z.string(),
  userPrompt: z.string().optional().default(""),
});

const SYSTEM_BASE = `You are a story development assistant for a single-screen fiction workspace called Story Canvas.
You always maintain continuity with the provided WORLD LORE.
Write in a cinematic, restrained literary voice unless asked otherwise.
Never break character with meta commentary. Respond ONLY with the requested content — no preambles like "Sure" or "Here is".`;

const MODE_PROMPT: Record<string, string> = {
  writer:
    "MODE: Writer. Expand or continue the scene with vivid sensory language, staying in the established tone. Keep it 2–4 short paragraphs unless asked otherwise.",
  critic:
    "MODE: Critic. Read the scene and surface 2–4 concrete issues: plot holes, unclear motivation, continuity gaps, thin worldbuilding. Bullet points. Be direct, not verbose.",
  debater:
    "MODE: Debater. Propose 2–3 bold alternate directions the story could take right now — each in one sentence, then one sentence on why it would work.",
  chat: "MODE: Assistant. Answer the user about their story or world. Ground every answer in the provided lore and current scene.",
};

export const invokeAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InvokeInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const userMsg = `WORLD LORE:\n${data.lore}\n\nCURRENT SCENE:\n${data.story}\n\nUSER REQUEST:\n${data.action}${data.userPrompt ? `\n\nADDITIONAL:\n${data.userPrompt}` : ""}`;

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
