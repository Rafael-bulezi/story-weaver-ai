import { z } from "zod";
import { getSavedSettings } from "./settings-store";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

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
    "quick_query",
    "summarize",
  ]),
  action: z.string(),
  context: z.string(),
  userPrompt: z.string().optional(),
});

export type InvokeInputType = z.infer<typeof InvokeInput>;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_BASE = `You are a story development assistant for a fiction workspace called Story Canvas.
You always maintain continuity with the provided WORLD CORES (canonical facts) and LORE.
First, output your internal creative thought process and reasoning inside a <think>...</think> block. After closing the tag, output your actual response.
Respond ONLY with the requested content — no preambles like "Sure" or "Here is" outside the think block.`;

const MODE_PROMPT: Record<string, string> = {
  writer:
    "MODE: Writer. Expand or continue the scene with vivid sensory language, staying in the established tone. Keep it 2–4 short paragraphs unless asked otherwise.",
  critic:
    "MODE: Critic. Read the material and surface 2–4 concrete issues: plot holes, unclear motivation, continuity gaps, thin worldbuilding. Bullet points. Be direct.",
  debater:
    "MODE: Debater. Propose 2–3 bold alternate directions — each in one sentence, then one sentence on why it would work.",
  chat: `MODE: Brainstorm. You are the user's creative writing partner with full memory of the book's Cores, Lore, and recent brainstorm history.

Behave like a fluent conversational assistant. No forced bullet lists, no forced length. Match the user's requested length EXACTLY.

When the user asks you to CREATE something (a character, plot beat, place, twist), briefly explain WHY you're designing it that way before presenting the design itself.

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
  quick_query:
    "MODE: Quick Answer. You are a knowledgeable assistant. Answer the user's question concisely using your general knowledge — you may draw on writing craft, mythology, history, science, or any relevant domain. Keep answers short (2–5 sentences) unless the user explicitly asks for more. Be direct and useful.",
  summarize:
    "MODE: Story Summarizer / Canon README. Produce a crisp, coherent, living overview of the story's current state and canon trajectory (150–250 words max). Synthesize key characters, factions, core conflicts, world rules, and recent chapter events. Return ONLY the narrative overview without markdown title headers or conversational filler.",
};

// Cost and Request tracking helpers
export interface CostTrackingData {
  writing: number;
  architect: number;
  total: number;
  writingCalls: number;
  architectCalls: number;
  totalCalls: number;
  lastCallAt?: string;
}

function trackCost(brainType: "writing" | "architect", inputText: string, outputText: string) {
  if (typeof window === "undefined") return;
  
  // Rough token estimation: 1 token ~ 4 characters
  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = Math.ceil(outputText.length / 4);
  
  // Rate constants (per token)
  // Large Model (Writing): $10.00 / 1M tokens ($0.00001)
  // Small Model (Architect): $0.20 / 1M tokens ($0.0000002)
  const rate = brainType === "writing" ? 0.00001 : 0.0000002;
  const cost = (inputTokens + outputTokens) * rate;

  try {
    const rawCost = localStorage.getItem("sc:costs:v1");
    const currentCosts: CostTrackingData = rawCost
      ? JSON.parse(rawCost)
      : { writing: 0, architect: 0, total: 0, writingCalls: 0, architectCalls: 0, totalCalls: 0 };
    
    currentCosts[brainType] = (currentCosts[brainType] || 0) + cost;
    currentCosts.total = (currentCosts.total || 0) + cost;

    if (brainType === "writing") {
      currentCosts.writingCalls = (currentCosts.writingCalls || 0) + 1;
    } else {
      currentCosts.architectCalls = (currentCosts.architectCalls || 0) + 1;
    }
    currentCosts.totalCalls = (currentCosts.totalCalls || 0) + 1;
    currentCosts.lastCallAt = new Date().toISOString();
    
    localStorage.setItem("sc:costs:v1", JSON.stringify(currentCosts));
  } catch (e) {
    console.error("Failed to save costs", e);
  }
}

// ---------------------------------------------------------------------------
// invokeAssistant — calls the selected provider API based on settings
// ---------------------------------------------------------------------------

export async function invokeAssistant({
  data,
  signal,
}: {
  data: InvokeInputType;
  signal?: AbortSignal;
}): Promise<{ content: string; thought?: string }> {
  const settings = getSavedSettings();
  
  // Determine if it is a Writing Brain or Architect Brain task
  // quick_query stays on writing brain for better general knowledge quality
  const isArchitect = ["extract", "categorize", "suggest_fix", "cores_ask", "summarize"].includes(data.mode);
  const brainType = isArchitect ? "architect" : "writing";
  const modelName = isArchitect ? settings.architectModel : settings.writingModel;

  // Resolve API Endpoint, Key, and Request Body format
  let apiKey = "";
  let baseUrl = "https://api.groq.com/openai/v1";
  let finalModel = modelName;

  // Auto-detect provider based on model selection prefix or custom provider configuration
  if (modelName.startsWith("gpt-") || modelName === "custom-openai") {
    apiKey = settings.apiKeys.openai;
    baseUrl = "https://api.openai.com/v1";
  } else if (modelName.startsWith("claude-") || modelName === "custom-anthropic") {
    apiKey = settings.apiKeys.anthropic;
    baseUrl = "https://api.anthropic.com/v1"; // Note: For standard client calls, might require proxy, but we use direct standard fetch
  } else if (modelName.startsWith("gemini-") || modelName === "custom-google") {
    apiKey = settings.apiKeys.google;
    baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
  } else if (modelName.startsWith("deepseek-") || modelName === "custom-deepseek") {
    apiKey = settings.apiKeys.deepseek;
    baseUrl = "https://api.deepseek.com/v1";
  } else if (modelName === "local-model") {
    apiKey = settings.apiKeys.local || "no-key";
    baseUrl = settings.endpoints.local;
    finalModel = settings.apiKeys.ollamaModel || "llama3.2";
  } else if (modelName === "openrouter-model") {
    apiKey = settings.apiKeys.openrouter;
    baseUrl = "https://openrouter.ai/api/v1";
    finalModel = settings.apiKeys.openrouterModel || "google/gemini-2.5-flash";
  } else {
    // Default: Groq provider
    apiKey = settings.apiKeys.groq || import.meta.env.VITE_GROQ_API_KEY || "";
    baseUrl = import.meta.env.VITE_AI_BASE_URL || "https://api.groq.com/openai/v1";
    
    // Default model if none configured
    if (!modelName) {
      finalModel = isArchitect ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
    }
  }

  // Final check for key
  if (!apiKey) {
    // If fallback Groq key is available in env and they are using Groq models
    if (!isArchitect && baseUrl.includes("groq")) {
      apiKey = import.meta.env.VITE_GROQ_API_KEY || "";
    }
    
    if (!apiKey) {
      throw new Error(
        `No API key configured for ${isArchitect ? "Architect" : "Writing"} Brain (${finalModel}). Please open Settings and add your API key.`
      );
    }
  }

  const userMsg = `${data.context}\n\n---\n\nUSER REQUEST:\n${data.action}${
    data.userPrompt ? `\n\nADDITIONAL:\n${data.userPrompt}` : ""
  }`;

  const sysPrompt = `${SYSTEM_BASE}\n\n${MODE_PROMPT[data.mode] ?? ""}`;

  // Configure temperature and max tokens based on response length setting
  let maxTokens = 1024;
  if (settings.responseLength === "brief") maxTokens = 300;
  else if (settings.responseLength === "balanced") maxTokens = 800;
  else if (settings.responseLength === "detailed") maxTokens = 1500;
  else if (settings.responseLength === "maximum") maxTokens = 3000;

  const temp = settings.creativity ?? 0.8;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: finalModel,
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userMsg },
      ],
      temperature: temp,
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429)
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (res.status === 401 || res.status === 403)
      throw new Error(`Invalid API key. Check settings for model: ${finalModel}`);
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const rawContent = json.choices?.[0]?.message?.content ?? "";
  
  let content = rawContent;
  let thought: string | undefined;

  const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thought = thinkMatch[1].trim();
    content = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }
  
  // Track estimated cost
  trackCost(brainType, sysPrompt + userMsg, content);

  return { content, thought };
}
