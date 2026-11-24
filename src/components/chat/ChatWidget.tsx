"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, regenerate } = useChat();

  const isGenerating = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setInput("");
    await sendMessage({ text: trimmed });
  };

  return (
    <div
      className="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-label="VibeLock AI Assistant"
    >
      {/* ── 1. Floating Trigger Button ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group rounded-brand bg-vl-dark-900 text-vl-white-50 border-vl-dark-700 hover:border-vl-cyan-500/50 hover:bg-vl-dark-800 focus-visible:ring-vl-cyan-500 flex size-12 cursor-pointer items-center justify-center border shadow-xl transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none sm:size-14"
          aria-label="Open VibeLock AI Chat Assistant"
        >
          <div className="relative">
            <Sparkles className="text-vl-cyan-400 size-5 transition-transform duration-200 group-hover:scale-110 sm:size-6" />
            <span className="absolute -top-1 -right-1 flex size-2">
              <span className="bg-vl-cyan-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
              <span className="bg-vl-cyan-500 relative inline-flex size-2 rounded-full" />
            </span>
          </div>
        </button>
      )}

      {/* ── 2. Expanded Chat Window ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="VibeLock AI Assistant Dialog"
          className="rounded-brand border-vl-dark-700 bg-vl-dark-900 text-vl-white-100 flex h-[480px] w-[calc(100vw-2rem)] max-w-sm flex-col border shadow-2xl transition-all duration-200 sm:w-88"
        >
          {/* Header */}
          <div className="border-vl-dark-800 bg-vl-dark-950 rounded-t-brand flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-brand bg-vl-cyan-500/10 text-vl-cyan-400 border-vl-cyan-500/20 flex size-7 items-center justify-center border">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-vl-white-100 flex items-center gap-1.5 text-xs font-bold">
                  VibeLock Assistant
                  <span className="bg-vl-cyan-500/10 text-3xs text-vl-cyan-400 border-vl-cyan-500/30 inline-flex items-center rounded-xs border px-1 py-0.5 font-semibold">
                    AI
                  </span>
                </h3>
                <p className="text-3xs text-vl-dark-400">অনলাইন সহায়তা ও অর্ডার ট্র্যাকিং</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-brand text-vl-dark-400 hover:bg-vl-dark-800 hover:text-vl-white-100 focus-visible:ring-vl-cyan-500 flex size-8 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Close Chat Assistant"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs">
            {messages.length === 0 && (
              <div className="space-y-3 py-6 text-center">
                <div className="bg-vl-cyan-500/10 text-vl-cyan-400 border-vl-cyan-500/20 mx-auto flex size-10 items-center justify-center rounded-full border">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-vl-white-100 font-semibold">স্বাগতম VibeLock-এ!</p>
                  <p className="text-3xs text-vl-dark-400 mx-auto max-w-[240px] leading-relaxed">
                    আপনার অর্ডার স্ট্যাটাস জানতে অর্ডার নম্বর (যেমন: VL-XXXX) লিখুন অথবা পোশাক ও
                    ডেলিভারি নিয়ে প্রশ্ন করুন।
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="bg-vl-cyan-500/10 text-vl-cyan-400 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Bot className="size-3" />
                  </div>
                )}
                <div
                  className={`rounded-brand max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-vl-cyan-500 text-vl-dark-950 font-medium"
                      : "bg-vl-dark-800 text-vl-white-200 border-vl-dark-700 border"
                  }`}
                >
                  {m.parts.map((part, idx) => {
                    if (part.type === "text") {
                      return <MarkdownContent key={idx} content={part.text} />;
                    }
                    if (part.type === "tool-getOrderStatus") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 text-3xs text-vl-cyan-300 border-vl-cyan-500/20 my-1.5 flex items-center gap-1.5 rounded-xs border px-2 py-1"
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isComplete ? "bg-vl-cyan-400" : "bg-vl-cyan-400 animate-ping"
                            }`}
                          />
                          <span>
                            {isComplete
                              ? "অর্ডার রেকর্ড যাচাই সম্পন্ন"
                              : "অর্ডারের তথ্য খোঁজা হচ্ছে..."}
                          </span>
                        </div>
                      );
                    }
                    if (part.type === "tool-searchProducts") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 text-3xs text-vl-cyan-300 border-vl-cyan-500/20 my-1.5 flex items-center gap-1.5 rounded-xs border px-2 py-1"
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isComplete ? "bg-vl-cyan-400" : "bg-vl-cyan-400 animate-ping"
                            }`}
                          />
                          <span>
                            {isComplete
                              ? "প্রোডাক্ট ক্যাটালগ যাচাই সম্পন্ন"
                              : "পোশাকের ক্যাটালগ খোঁজা হচ্ছে..."}
                          </span>
                        </div>
                      );
                    }
                    if (part.type === "tool-requestHumanSupport") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 text-3xs text-emerald-400 border-emerald-500/20 my-1.5 flex items-center gap-1.5 rounded-xs border px-2 py-1"
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isComplete ? "bg-emerald-400" : "bg-emerald-400 animate-ping"
                            }`}
                          />
                          <span>
                            {isComplete
                              ? "হোয়াটসঅ্যাপ সাপোর্ট প্রস্তুত"
                              : "সাপোর্ট লিংক তৈরি হচ্ছে..."}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="text-3xs text-vl-cyan-400 flex items-center gap-1.5 pt-1">
                <span className="bg-vl-cyan-400 size-1.5 animate-ping rounded-full" />
                VibeLock Assistant ভাবছে...
              </div>
            )}

            {error && (
              <div className="rounded-brand text-3xs flex flex-col gap-1.5 border border-red-500/30 bg-red-950/30 p-2.5 text-red-300">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="font-semibold break-words">
                    {error.message === "An error occurred." ||
                    error.message?.includes("503") ||
                    error.message?.includes("high demand")
                      ? "গুগল সার্ভার এই মুহূর্তে ব্যস্ত (High Demand)। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
                      : error.message?.includes("429") || error.message?.includes("অনুরোধের সীমা")
                        ? "অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।"
                        : error.message || "বার্তা পাঠাতে সমস্যা হয়েছে।"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => regenerate()}
                  className="mt-0.5 flex w-fit cursor-pointer items-center gap-1 rounded-xs border border-vl-cyan-500/30 bg-vl-dark-900 px-2 py-1 text-3xs font-medium text-vl-cyan-300 transition-colors hover:bg-vl-dark-800 hover:text-vl-cyan-200"
                >
                  <RefreshCw className="size-2.5" />
                  পুনরায় চেষ্টা করুন
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="border-vl-dark-800 bg-vl-dark-950 rounded-b-brand flex gap-2 border-t p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="একটি প্রশ্ন বা অর্ডার নম্বর লিখুন..."
              disabled={isGenerating}
              className="rounded-brand bg-vl-dark-900 text-vl-white-100 placeholder:text-vl-dark-400 border-vl-dark-700 focus:border-vl-cyan-500 flex-1 border px-3 py-2 text-xs focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="rounded-brand bg-vl-cyan-500 text-vl-dark-950 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan-500 flex size-8 shrink-0 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
