"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { getMatches, getProfile } from "@/lib/client/store";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const QUICK_QUESTIONS = [
  "Which schemes are suitable for me?",
  "Why was this scheme recommended?",
  "What documents do I need?",
  "How much funding can I receive?",
  "What should I do next?",
  "Help me prepare a business plan",
];

// Minimal typing for the Web Speech API
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function renderMarkdown(text: string) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return { __html: html };
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Vanakkam! 🙏 I'm **Udyam AI Assistant**. Ask me about schemes, eligibility, documents or next steps. I answer using your profile and verified scheme data only.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const profile = getProfile();
      const cached = getMatches();
      const matches = (cached?.eligible ?? []).slice(0, 5).map((m) => ({
        schemeId: m.schemeId,
        schemeName: m.schemeName,
        score: m.score,
        reasons: m.reasons,
        warnings: m.warnings,
        maxFunding: m.scheme.maxFunding,
        documents: m.scheme.documents,
        officialUrl: m.scheme.officialUrl,
        supportTypes: m.scheme.supportTypes,
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context: { profile, matches } }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply ?? "Sorry, I couldn't process that." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
        >
          <Bot size={18} /> Udyam AI
        </button>
      )}

      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[400px] sm:rounded-2xl sm:border sm:border-slate-200">
          <div className="flex items-center justify-between rounded-t-none bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-white sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">Udyam AI Assistant</p>
                <p className="mt-0.5 text-[11px] text-emerald-100">
                  Grounded in your profile & scheme data
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800"
                  }`}
                  dangerouslySetInnerHTML={renderMarkdown(m.text)}
                />
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Sparkles size={14} className="animate-pulse text-emerald-600" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 p-3">
            {voiceSupported ? (
              <button
                onClick={toggleVoice}
                title={listening ? "Stop listening" : "Speak"}
                className={`rounded-full p-2.5 transition ${
                  listening
                    ? "animate-pulse bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            ) : (
              <span title="Voice input not supported in this browser" className="rounded-full bg-slate-50 p-2.5 text-slate-300">
                <Mic size={16} />
              </span>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about schemes, documents…"
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="rounded-full bg-emerald-600 p-2.5 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
