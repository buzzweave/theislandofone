import { useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileText,
  Loader2,
  PenLine,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// --- Types ---
interface DraftCard {
  id: string;
  timestamp: Date;
  context: string;
  text: string;
}

// --- Constants ---
const CONTEXT_OPTIONS = [
  "Entire Book",
  "Current Chapter",
  "Sermon Manuscript",
  "Selected Text",
  "Private Notes Only",
];

const WRITING_ACTIONS = [
  "Expand this section",
  "Shorten this section",
  "Improve flow and clarity",
  "Rewrite in a warmer pastoral tone",
  "Rewrite in a stronger preaching tone",
  "Make this more devotional",
  "Make this more teaching-oriented",
];

const SERMON_ACTIONS = [
  "Add illustration",
  "Strengthen opening",
  "Sharpen altar call",
  "Add scripture references",
  "Improve transitions between points",
];

const BOOK_ACTIONS = [
  "Improve chapter opening",
  "Improve chapter closing",
  "Add reflective depth",
  "Improve narrative continuity",
];

// --- Component ---
export default function AISidebar({
  contentType = "sermon",
}: {
  contentType?: "book" | "sermon" | "chapter" | "notes";
}) {
  const { toast } = useToast();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disabled" | "error">("connected");
  const [selectedContext, setSelectedContext] = useState("Selected Text");
  const [customPrompt, setCustomPrompt] = useState("");
  const [notesMode, setNotesMode] = useState(false);
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [maxResponses, setMaxResponses] = useState(25);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [callsToday, setCallsToday] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const statusColor =
    connectionStatus === "connected"
      ? "bg-emerald-500"
      : connectionStatus === "disabled"
      ? "bg-amber-500"
      : "bg-red-500";

  const statusLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "disabled"
      ? "Key Present · AI Disabled"
      : "No Key / Error";

  const callAI = async (action: string, customPromptText?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-writing", {
        body: {
          action,
          context: selectedContext,
          contentType,
          customPrompt: customPromptText || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to get AI response");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const draft: DraftCard = {
        id: Date.now().toString(),
        timestamp: new Date(),
        context: selectedContext,
        text: data.text || "No response received.",
      };
      setDrafts((prev) => [draft, ...prev]);
      setCallsToday((prev) => prev + 1);
    } catch (err: any) {
      console.error("AI action error:", err);
      toast({
        title: "AI Error",
        description: err.message || "Something went wrong with the AI request.",
        variant: "destructive",
      });
      setConnectionStatus("error");
      setTimeout(() => setConnectionStatus("connected"), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    callAI(action);
  };

  const handleCustomSubmit = () => {
    if (!customPrompt.trim()) return;
    callAI("custom prompt", customPrompt);
    setCustomPrompt("");
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const copyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const toggleAi = () => {
    setAiEnabled(!aiEnabled);
    setConnectionStatus(!aiEnabled ? "connected" : "disabled");
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* ─── 1) AI STATUS HEADER ─── */}
      <div className="px-4 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wide">AI Assistant</span>
          </div>
          {isLoading && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
          </div>
          <button
            onClick={toggleAi}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              aiEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                aiEnabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Lovable AI (Admin-configured)</p>
      </div>

      {/* ─── Scrollable body ─── */}
      <div className="flex-1 overflow-y-auto">
        {!aiEnabled ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">AI is disabled. Toggle above to enable.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* ─── 2) CONTEXT SELECTOR ─── */}
            <div className="px-4 py-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Apply AI to
              </label>
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                {CONTEXT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── 3) QUICK ACTION BUTTONS ─── */}
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Writing Actions
              </p>
              <div className="flex flex-col gap-1.5">
                {WRITING_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-secondary-foreground bg-background border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="h-3 w-3 text-primary shrink-0" />
                    {action}
                  </button>
                ))}
              </div>

              {/* Sermon-specific */}
              {(contentType === "sermon") && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Sermon Actions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SERMON_ACTIONS.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-secondary-foreground bg-background border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PenLine className="h-3 w-3 text-primary shrink-0" />
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Book-specific */}
              {(contentType === "book" || contentType === "chapter") && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Book Actions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {BOOK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-secondary-foreground bg-background border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PenLine className="h-3 w-3 text-primary shrink-0" />
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── 4) CUSTOM PROMPT BOX ─── */}
            <div className="px-4 py-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Ask AI (Private Draft)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="Rewrite this paragraph with more authority and simplicity, keeping the same meaning."
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customPrompt.trim() || isLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Submit
                </button>
                <button
                  onClick={() => setCustomPrompt("")}
                  className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ─── 6) NOTES MODE TOGGLE ─── */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI → Notes Mode
                  </span>
                </div>
                <button
                  onClick={() => setNotesMode(!notesMode)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    notesMode ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                      notesMode ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {notesMode && (
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  AI output will go to Private Notes only. Notes are admin-only, never published, and not included in exports.
                </p>
              )}
            </div>

            {/* ─── 5) AI DRAFT OUTPUT ─── */}
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                AI Draft Output
              </p>
              {drafts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No drafts yet. Run an action above.</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground">
                          {draft.timestamp.toLocaleTimeString()} · {draft.context}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-foreground leading-relaxed mb-3 whitespace-pre-wrap">
                        {draft.text}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                          <Plus className="h-2.5 w-2.5" /> Insert
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                          <RotateCcw className="h-2.5 w-2.5" /> Replace
                        </button>
                        <button
                          onClick={() => copyDraft(draft.text)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors"
                        >
                          <ClipboardCopy className="h-2.5 w-2.5" /> Copy
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors">
                          <FileText className="h-2.5 w-2.5" /> Save Note
                        </button>
                        <button
                          onClick={() => removeDraft(draft.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-destructive/70 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> Discard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── 7) SAFETY & LIMITS ─── */}
            <div className="px-4 py-4">
              <button
                onClick={() => setSafetyOpen(!safetyOpen)}
                className="flex items-center gap-2 w-full text-left"
              >
                {safetyOpen ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Controls
                </span>
              </button>
              {safetyOpen && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Max responses per session</label>
                    <input
                      type="number"
                      value={maxResponses}
                      onChange={(e) => setMaxResponses(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Daily usage limit</label>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="pt-2 space-y-1 text-[10px] text-muted-foreground">
                    <p>Calls today: <span className="text-foreground font-medium">{callsToday}</span></p>
                    <p>Estimated tokens: <span className="text-foreground font-medium">~{callsToday * 450}</span></p>
                  </div>
                  <button
                    onClick={() => setCallsToday(0)}
                    className="w-full py-1.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset Usage Counter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── 8) GUARDRAILS ─── */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <p className="text-[9px] text-muted-foreground/70 leading-relaxed text-center">
          AI assists the writing process. All content remains under author authority and must be reviewed before publishing.
        </p>
      </div>
    </div>
  );
}
