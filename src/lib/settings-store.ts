import { useEffect, useState } from "react";

export type ThemeType = "light" | "dark" | "system";
export type AccentColorType = "purple" | "blue" | "emerald" | "rose" | "amber" | "indigo";
export type FontType = "serif" | "sans" | "mono";
export type FontSizeType = "sm" | "md" | "lg";
export type ResponseLengthType = "brief" | "balanced" | "detailed" | "maximum";

export interface SettingsState {
  theme: ThemeType;
  accentColor: AccentColorType;
  fontFamily: FontType;
  fontSize: FontSizeType;
  writingModel: string;
  architectModel: string;
  apiKeys: {
    groq: string;
    openai: string;
    anthropic: string;
    google: string;
    deepseek: string;
    openrouter: string;
    openrouterModel: string;   // custom model slug for OpenRouter
    local: string;
    ollama: string;            // optional bearer token (usually empty for local Ollama)
    ollamaModel: string;       // e.g. "llama3.2" or "mistral"
  };
  endpoints: {
    local: string;
    ollama: string;
  };
  responseLength: ResponseLengthType;
  creativity: number;
  autoContinue: boolean;
  streaming: boolean;
  autoMemory: boolean;
  autoSaveArtifacts: boolean;
  topicRetrieval: "topic" | "project" | "workspace";
  knowledgeUpdates: "manual" | "suggested" | "automatic";
}

const SETTINGS_KEY = "sc:settings:v1";

const DEFAULT_SETTINGS: SettingsState = {
  theme: "dark",
  accentColor: "purple",
  fontFamily: "serif",
  fontSize: "md",
  writingModel: "qwen/qwen3.6-27b",
  architectModel: "llama-3.1-8b-instant",
  apiKeys: {
    groq: "",
    openai: "",
    anthropic: "",
    google: "",
    deepseek: "",
    openrouter: "",
    openrouterModel: "",
    local: "",
    ollama: "",
    ollamaModel: "llama3.2",
  },
  endpoints: {
    local: "http://localhost:11434/v1",
    ollama: "http://localhost:11434",
  },
  responseLength: "balanced",
  creativity: 0.8,
  autoContinue: false,
  streaming: false,
  autoMemory: true,
  autoSaveArtifacts: true,
  topicRetrieval: "project",
  knowledgeUpdates: "suggested",
};

// Colors mapping to OKLCH values for dynamic applying
const ACCENT_COLORS = {
  purple: {
    primary: "oklch(0.5 0.18 285)",
    bg: "oklch(0.965 0.02 285)",
    ring: "oklch(0.55 0.16 285)"
  },
  blue: {
    primary: "oklch(0.55 0.15 240)",
    bg: "oklch(0.965 0.02 240)",
    ring: "oklch(0.6 0.13 240)"
  },
  emerald: {
    primary: "oklch(0.52 0.15 150)",
    bg: "oklch(0.965 0.02 150)",
    ring: "oklch(0.57 0.13 150)"
  },
  rose: {
    primary: "oklch(0.55 0.17 10)",
    bg: "oklch(0.965 0.02 10)",
    ring: "oklch(0.6 0.15 10)"
  },
  amber: {
    primary: "oklch(0.62 0.15 75)",
    bg: "oklch(0.97 0.015 75)",
    ring: "oklch(0.67 0.13 75)"
  },
  indigo: {
    primary: "oklch(0.48 0.17 265)",
    bg: "oklch(0.96 0.02 265)",
    ring: "oklch(0.53 0.15 265)"
  }
};

export function getSavedSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SettingsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettingsThemeAndAccent(settings);
}

export function applySettingsThemeAndAccent(settings: SettingsState) {
  if (typeof window === "undefined") return;
  const doc = document.documentElement;

  // Apply Theme
  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    doc.classList.add("dark");
  } else {
    doc.classList.remove("dark");
  }

  // Apply Accent Colors
  const colors = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.purple;
  doc.style.setProperty("--primary", colors.primary);
  doc.style.setProperty("--writer", colors.primary);
  doc.style.setProperty("--ring", colors.ring);
  
  if (isDark) {
    const darkBgMap = {
      purple: "oklch(0.19 0.02 285)",
      blue: "oklch(0.19 0.02 240)",
      emerald: "oklch(0.19 0.02 150)",
      rose: "oklch(0.19 0.02 10)",
      amber: "oklch(0.2 0.015 75)",
      indigo: "oklch(0.18 0.02 265)"
    };
    doc.style.setProperty("--writer-bg", darkBgMap[settings.accentColor] || darkBgMap.purple);
  } else {
    doc.style.setProperty("--writer-bg", colors.bg);
  }

  // Apply Font
  if (settings.fontFamily === "serif") {
    doc.style.setProperty("--font-serif", '"Fraunces", "Iowan Old Style", "Georgia", serif');
  } else if (settings.fontFamily === "sans") {
    doc.style.setProperty("--font-serif", '"Inter", ui-sans-serif, system-ui, sans-serif');
  } else {
    doc.style.setProperty("--font-serif", '"JetBrains Mono", "Fira Code", monospace');
  }

  // Apply Font Size
  if (settings.fontSize === "sm") {
    doc.style.setProperty("--radius", "0.75rem");
  } else if (settings.fontSize === "md") {
    doc.style.setProperty("--radius", "0.875rem");
  } else {
    doc.style.setProperty("--radius", "1rem");
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<SettingsState>(getSavedSettings);

  useEffect(() => {
    // Initial apply
    applySettingsThemeAndAccent(settings);
  }, []);

  const setSettings = (update: Partial<SettingsState> | ((prev: SettingsState) => SettingsState)) => {
    setSettingsState((prev) => {
      const next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      saveSettings(next);
      return next;
    });
  };

  return [settings, setSettings] as const;
}
