import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { ChatMessage, CommuteMode, ComputedProperty, OfficeHub, PriorityWeights } from "../types/rental";

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHub: OfficeHub;
  commuteMode: CommuteMode;
  maxBudget: number;
  bhkFilter: string;
  localityFilter: string;
  weights: PriorityWeights;
  properties: ComputedProperty[];
}

const STARTER_PROMPTS = [
  "I work at Ecoworld with a ₹45k total budget, should I pick Bellandur or Sarjapur?",
  "Which 2BHK saves the most traffic hours without tanker water risk?",
  "Compare Whitefield vs Electronic City for Metro commute and deposit lock-in.",
];

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  selectedHub,
  commuteMode,
  maxBudget,
  bhkFilter,
  localityFilter,
  weights,
  properties,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Ask me about any Bengaluru corridor trade-off. I am synced with your live filters (${selectedHub.shortName}, ${commuteMode}, max ₹${maxBudget.toLocaleString(
        "en-IN"
      )} TMCL) and all ${properties.length} computed listings.`,
      timestamp: "Now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: nextMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
          context: {
            officeHubName: selectedHub.name,
            commuteMode,
            maxBudget,
            bhkFilter,
            localityFilter,
            weights,
            propertiesSummary: properties.slice(0, 12).map((p) => ({
              name: p.name,
              societyName: p.societyName,
              locality: p.locality,
              bhk: p.bhk,
              baseRent: p.baseRent,
              maintenanceCharges: p.maintenanceCharges,
              securityDeposit: p.securityDeposit,
              trueMonthlyCost: p.trueMonthlyCost,
              monthlyCommuteCost: p.monthlyCommuteCost,
              peakCommuteMinutes: p.peakCommuteMinutes,
              monthlyTrafficHours: p.monthlyTrafficHours,
              waterReliability: p.waterReliability,
              metroKm: p.nearbyDistances.metroKm,
              smartMatchScore: p.smartMatchScore,
            })),
          },
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to reach NammaRent AI Advisor");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? "No response generated.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Advisor request failed";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Could not reach Gemini AI right now (${errMsg}). Check that GEMINI_API_KEY is set in Settings > Secrets.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ask NammaRent AI Advisor"
    >
      <aside
        className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Ask NammaRent AI
              </h2>
              <p className="text-[11px] text-slate-500">
                Grounded in {selectedHub.shortName} · {commuteMode} · ₹
                {maxBudget.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Close AI Advisor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Starter Prompts */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500">Suggested Queries</div>
          <div className="flex flex-col gap-1.5">
            {STARTER_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendQuestion(q)}
                disabled={isSending}
                className="text-left text-xs text-slate-700 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 hover:border-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800 border border-slate-200"
                }`}
              >
                {msg.content}
              </div>
              <span className="mt-1 text-[10px] text-slate-400 font-mono-num">
                {msg.role === "user" ? "You" : "NammaRent AI"} · {msg.timestamp}
              </span>
            </div>
          ))}
          {isSending && (
            <div className="bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-500 max-w-[75%]">
              Evaluating Bengaluru corridor costs & traffic models...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about localities, rent vs commute..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
};
