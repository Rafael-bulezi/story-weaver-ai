import { useState, useEffect } from "react";
import {
  X,
  Settings,
  Sliders,
  Key,
  BrainCircuit,
  Coins,
  Palette,
  Check,
} from "lucide-react";
import { useSettings, type AccentColorType, type ResponseLengthType } from "@/lib/settings-store";
import { toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useSettings();
  const [activeTab, setActiveTab] = useState<"general" | "models" | "behavior" | "cost">("general");

  // Local state for live API key editing
  const [keys, setKeys] = useState(settings.apiKeys);
  const [localEndpoint, setLocalEndpoint] = useState(settings.endpoints.local);

  // Sync keys state when settings load
  useEffect(() => {
    setKeys(settings.apiKeys);
    setLocalEndpoint(settings.endpoints.local);
  }, [settings.apiKeys, settings.endpoints.local]);

  // Save specific section helper
  const saveKeys = () => {
    setSettings({
      apiKeys: keys,
      endpoints: {
        local: localEndpoint,
        ollama: settings.endpoints.ollama || "http://localhost:11434",
      },
    });
    toastSuccess("API Keys & Endpoints saved");
  };

  // Get live cost and request tracking stats from localStorage
  const [costs, setCosts] = useState({
    writing: 0,
    architect: 0,
    total: 0,
    writingCalls: 0,
    architectCalls: 0,
    totalCalls: 0,
    lastCallAt: undefined as string | undefined,
  });
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("sc:costs:v1");
      if (raw) {
        setCosts(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
  }, [open]);

  const resetCosts = () => {
    const fresh = { writing: 0, architect: 0, total: 0, writingCalls: 0, architectCalls: 0, totalCalls: 0 };
    localStorage.setItem("sc:costs:v1", JSON.stringify(fresh));
    setCosts(fresh);
    toastSuccess("Cost and request counters reset");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-soft-fade-in">
      <div className="relative flex h-[82vh] w-full max-w-2xl flex-col rounded-[2.5rem] border border-border bg-background shadow-2xl overflow-hidden animate-slide-up-fade">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-foreground">Control Center</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">StoryWeave Config & Brains</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left Navigation bar */}
          <div className="w-1/3 border-r border-border/60 bg-muted/20 px-3 py-4 flex flex-col gap-1.5 shrink-0">
            <TabBtn
              icon={Palette}
              label="Appearance"
              active={activeTab === "general"}
              onClick={() => setActiveTab("general")}
            />
            <TabBtn
              icon={BrainCircuit}
              label="AI Models & Keys"
              active={activeTab === "models"}
              onClick={() => setActiveTab("models")}
            />
            <TabBtn
              icon={Sliders}
              label="AI Behavior"
              active={activeTab === "behavior"}
              onClick={() => setActiveTab("behavior")}
            />
            <TabBtn
              icon={Coins}
              label="Cost Dashboard"
              active={activeTab === "cost"}
              onClick={() => setActiveTab("cost")}
            />
          </div>

          {/* Right Content Panels */}
          <div className="thin-scrollbar flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {activeTab === "general" && (
              <div className="space-y-4">
                <h3 className="font-serif text-base font-bold text-foreground">General Styling</h3>
                
                {/* Theme Options */}
                <div className="space-y-2">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ThemeBtn label="Light" active={settings.theme === "light"} onClick={() => setSettings({ theme: "light" })} />
                    <ThemeBtn label="Dark" active={settings.theme === "dark"} onClick={() => setSettings({ theme: "dark" })} />
                    <ThemeBtn label="System" active={settings.theme === "system"} onClick={() => setSettings({ theme: "system" })} />
                  </div>
                </div>

                {/* Accent Color picker */}
                <div className="space-y-2">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">Accent Highlight Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    <ColorOption color="purple" bgClass="bg-purple-500" active={settings.accentColor === "purple"} onClick={() => setSettings({ accentColor: "purple" })} />
                    <ColorOption color="blue" bgClass="bg-blue-500" active={settings.accentColor === "blue"} onClick={() => setSettings({ accentColor: "blue" })} />
                    <ColorOption color="emerald" bgClass="bg-emerald-500" active={settings.accentColor === "emerald"} onClick={() => setSettings({ accentColor: "emerald" })} />
                    <ColorOption color="rose" bgClass="bg-rose-500" active={settings.accentColor === "rose"} onClick={() => setSettings({ accentColor: "rose" })} />
                    <ColorOption color="amber" bgClass="bg-amber-500" active={settings.accentColor === "amber"} onClick={() => setSettings({ accentColor: "amber" })} />
                    <ColorOption color="indigo" bgClass="bg-indigo-500" active={settings.accentColor === "indigo"} onClick={() => setSettings({ accentColor: "indigo" })} />
                  </div>
                </div>

                {/* Font Choices */}
                <div className="space-y-2">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">Editor Font</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ThemeBtn label="Serif (Classic)" active={settings.fontFamily === "serif"} onClick={() => setSettings({ fontFamily: "serif" })} />
                    <ThemeBtn label="Sans (Clean)" active={settings.fontFamily === "sans"} onClick={() => setSettings({ fontFamily: "sans" })} />
                    <ThemeBtn label="Mono (Modern)" active={settings.fontFamily === "mono"} onClick={() => setSettings({ fontFamily: "mono" })} />
                  </div>
                </div>

                {/* Font Size Choices */}
                <div className="space-y-2">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">Interface Scale</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ThemeBtn label="Compact" active={settings.fontSize === "sm"} onClick={() => setSettings({ fontSize: "sm" })} />
                    <ThemeBtn label="Standard" active={settings.fontSize === "md"} onClick={() => setSettings({ fontSize: "md" })} />
                    <ThemeBtn label="Large" active={settings.fontSize === "lg"} onClick={() => setSettings({ fontSize: "lg" })} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "models" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">AI Brain Hierarchy</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    StoryWeave operates with different models for separate tasks.
                  </p>
                </div>

                {/* Writing Brain */}
                <div className="rounded-2xl border border-border p-3.5 bg-card/40 space-y-2.5">
                  <div>
                    <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      Writing Brain (Large Model)
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Handles scene prose expansion, alternate options, rewrite & critic reviews.</p>
                  </div>
                  <select
                    value={settings.writingModel}
                    onChange={(e) => setSettings({ writingModel: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground"
                  >
                    <option value="qwen/qwen3.6-27b">Qwen 3.6 27B (Groq / OpenRouter)</option>
                    <option value="qwen-2.5-32b">Qwen 2.5 32B (Groq)</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq - Default)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                    <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (Anthropic)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
                    <option value="deepseek-chat">DeepSeek Chat (DeepSeek V3)</option>
                    <option value="openrouter-model">Custom Model (OpenRouter)</option>
                    <option value="local-model">Local Model (Ollama/LM Studio)</option>
                  </select>
                </div>

                {/* Architect Brain */}
                <div className="rounded-2xl border border-border p-3.5 bg-card/40 space-y-2.5">
                  <div>
                    <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Architect Brain (Small Model)
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Handles lore extraction, core naming, suggestion fix options & librarian queries.</p>
                  </div>
                  <select
                    value={settings.architectModel}
                    onChange={(e) => setSettings({ architectModel: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground"
                  >
                    <option value="qwen/qwen3.6-27b">Qwen 3.6 27B (Groq / OpenRouter)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Groq - Default)</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</option>
                    <option value="deepseek-chat">DeepSeek Chat (DeepSeek)</option>
                    <option value="local-model">Local Model (Ollama/LM Studio)</option>
                  </select>
                </div>

                {/* API Keys Configuration */}
                <div className="space-y-3">
                  <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" /> Provider API Keys & Config
                  </h3>
                  
                  <div className="space-y-2.5">
                    <ApiKeyInput label="Groq Key" placeholder="gsk_..." value={keys.groq} onChange={(val) => setKeys({ ...keys, groq: val })} />
                    <ApiKeyInput label="OpenAI Key" placeholder="sk-..." value={keys.openai} onChange={(val) => setKeys({ ...keys, openai: val })} />
                    <ApiKeyInput label="Anthropic Key" placeholder="sk-ant-..." value={keys.anthropic} onChange={(val) => setKeys({ ...keys, anthropic: val })} />
                    <ApiKeyInput label="Google AI Key" placeholder="AIzaSy..." value={keys.google} onChange={(val) => setKeys({ ...keys, google: val })} />
                    <ApiKeyInput label="DeepSeek Key" placeholder="sk-..." value={keys.deepseek} onChange={(val) => setKeys({ ...keys, deepseek: val })} />
                    
                    <div className="border-t border-border/40 my-2 pt-2 space-y-2.5">
                      <ApiKeyInput label="OpenRouter Key" placeholder="sk-or-..." value={keys.openrouter} onChange={(val) => setKeys({ ...keys, openrouter: val })} />
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">OpenRouter Model Slug</label>
                        <input
                          value={keys.openrouterModel || ""}
                          onChange={(e) => setKeys({ ...keys, openrouterModel: e.target.value })}
                          placeholder="e.g. google/gemini-2.5-flash"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground font-mono"
                        />
                      </div>
                    </div>

                    <div className="border-t border-border/40 my-2 pt-2 space-y-2.5">
                      <ApiKeyInput label="Local API Key (Optional)" placeholder="Bearer token if any" value={keys.local} onChange={(val) => setKeys({ ...keys, local: val })} />
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Local Model Endpoint</label>
                        <input
                          value={localEndpoint}
                          onChange={(e) => setLocalEndpoint(e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Local Model Name (Ollama)</label>
                        <input
                          value={keys.ollamaModel || ""}
                          onChange={(e) => setKeys({ ...keys, ollamaModel: e.target.value })}
                          placeholder="e.g. llama3.2, mistral"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <Button size="sm" className="w-full rounded-xl" onClick={saveKeys}>
                    Save Config & Keys
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "behavior" && (
              <div className="space-y-4">
                <h3 className="font-serif text-base font-bold text-foreground">AI Behavior Settings</h3>

                {/* Response Length */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground">Response Length</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <LengthBtn label="Brief" active={settings.responseLength === "brief"} onClick={() => setSettings({ responseLength: "brief" })} />
                    <LengthBtn label="Balanced" active={settings.responseLength === "balanced"} onClick={() => setSettings({ responseLength: "balanced" })} />
                    <LengthBtn label="Detailed" active={settings.responseLength === "detailed"} onClick={() => setSettings({ responseLength: "detailed" })} />
                    <LengthBtn label="Maximum" active={settings.responseLength === "maximum"} onClick={() => setSettings({ responseLength: "maximum" })} />
                  </div>
                </div>

                {/* Temperature (Creativity) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                    <span>Creativity (Temperature)</span>
                    <span>{settings.creativity}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.creativity}
                    onChange={(e) => setSettings({ creativity: parseFloat(e.target.value) })}
                    className="w-full accent-primary bg-muted rounded-lg appearance-none h-1.5"
                  />
                  <div className="flex justify-between text-[9.5px] text-muted-foreground">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Auto continue & streaming mocks */}
                <div className="space-y-2 pt-2">
                  <ToggleSetting
                    label="Auto Continue Generation"
                    checked={settings.autoContinue}
                    onChange={(val) => setSettings({ autoContinue: val })}
                  />
                  <ToggleSetting
                    label="Real-time Streaming"
                    checked={settings.streaming}
                    onChange={(val) => setSettings({ streaming: val })}
                  />
                  <ToggleSetting
                    label="Automatic Project Memory"
                    checked={settings.autoMemory}
                    onChange={(val) => setSettings({ autoMemory: val })}
                  />
                  <ToggleSetting
                    label="Auto-Extract Characters/Lore"
                    checked={settings.autoSaveArtifacts}
                    onChange={(val) => setSettings({ autoSaveArtifacts: val })}
                  />
                </div>
              </div>
            )}

            {activeTab === "cost" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">Cost & Request Dashboard</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time spend and API request telemetry from assistant calls.</p>
                </div>

                {/* API Request Calls */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border bg-card/40 p-3.5 text-left shadow-sm">
                    <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Writing Calls</span>
                    <span className="block text-xl font-bold font-mono mt-1 text-foreground">
                      {costs.writingCalls || 0}
                    </span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">Prose & scenes</span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/40 p-3.5 text-left shadow-sm">
                    <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Architect Calls</span>
                    <span className="block text-xl font-bold font-mono mt-1 text-foreground">
                      {costs.architectCalls || 0}
                    </span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">Lore & indexing</span>
                  </div>

                  <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3.5 text-left shadow-sm">
                    <span className="block text-[10px] text-primary font-semibold uppercase tracking-wider">Total Requests</span>
                    <span className="block text-xl font-bold font-mono mt-1 text-primary">
                      {costs.totalCalls || 0}
                    </span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">API requests</span>
                  </div>
                </div>

                {/* Estimated Cost Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <CostCard label="Writing Spend" value={costs.writing} description="Large Model Cost" />
                  <CostCard label="Architect Spend" value={costs.architect} description="Small Model Cost" />
                  <CostCard label="Estimated Total" value={costs.total} description="Total Accumulated" highlight />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 p-4 mt-2">
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Request & Cost Advantage</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Every AI action (scene generation, lore extraction, plot check, brainstorm query) is counted as an atomic API request. Offloading extraction and indexing requests to the lightweight Architect Brain keeps token usage and API latency ultra-low.
                  </p>
                </div>

                <Button size="sm" variant="outline" className="w-full rounded-xl" onClick={resetCosts}>
                  Reset Request & Cost Counters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition active:scale-95 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/40"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ThemeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-center text-xs font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ColorOption({ color, bgClass, active, onClick }: { color: AccentColorType; bgClass: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 w-7 rounded-full flex items-center justify-center ${bgClass} shadow active:scale-90 transition-transform`}
      title={color}
    >
      {active && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

function ApiKeyInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (val: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
        <span>{label}</span>
        <button type="button" onClick={() => setVisible(!visible)} className="text-[10px] text-primary hover:underline">
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none text-foreground font-mono"
      />
    </div>
  );
}

function LengthBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border py-1.5 text-center text-[10.5px] font-bold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
      <span className="text-[12px] font-semibold text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4.5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function CostCard({ label, value, description, highlight }: { label: string; value: number; description: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 text-left shadow-sm ${
      highlight ? "border-primary bg-primary/5" : "border-border bg-card/40"
    }`}>
      <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
      <span className={`block text-xl font-bold font-serif mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>
        ${value.toFixed(4)}
      </span>
      <span className="block text-[9px] text-muted-foreground mt-0.5">{description}</span>
    </div>
  );
}
