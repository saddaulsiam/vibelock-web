"use client";

import { useChat } from "@ai-sdk/react";
import {
  AlertCircle,
  Bot,
  BotMessageSquare,
  MapPin,
  Maximize2,
  Minimize2,
  PackageSearch,
  RefreshCw,
  Ruler,
  Send,
  Shirt,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

export interface ChatWidgetUser {
  name?: string | null;
  email?: string | null;
}

interface ChatWidgetProps {
  initialUser?: ChatWidgetUser | null;
}

interface SuggestedPrompt {
  title: string;
  prompt: string;
  icon: typeof PackageSearch;
  instantAnswer: string;
}

function getSuggestedPrompts(isLoggedIn: boolean): SuggestedPrompt[] {
  return [
    {
      title: "অর্ডার ট্র্যাক করতে চাই",
      prompt: "আমার অর্ডার স্ট্যাটাস জানতে চাই",
      icon: PackageSearch,
      instantAnswer: isLoggedIn
        ? `আপনার অর্ডারের রিয়েল-টাইম স্ট্যাটাস ও ডেলিভারি তথ্য জানতে:

আপনার **অর্ডার নম্বরটি** (যেমন: \`VL-83910275\`) নিচে লিখে পাঠিয়ে দিন। আমি সঙ্গে সঙ্গে আপনার অর্ডারের বর্তমান অবস্থা জানিয়ে দেব!`
        : `অর্ডার ট্র্যাকিং ও বিস্তারিত তথ্য জানতে:

আপনি বর্তমানে অ্যাকাউন্টে সাইন ইন অবস্থায় নেই। আপনার অর্ডারের তথ্য দেখতে:
- সরাসরি আপনার অ্যাকাউন্টে **[সাইন ইন](/login)** করতে পারেন, অথবা
- আপনার **অর্ডার নম্বর** এবং অর্ডারে ব্যবহৃত **ফোন নম্বরের শেষ ৪টি ডিজিট** নিচে লিখে জানান (যেমন: \`VL-1001 এবং 3277\`)।

অনুগ্রহ করে আপনার অর্ডার নম্বর ও ফোন নম্বরের শেষ ৪ ডিজিট নিচে লিখুন:`,
    },
    {
      title: "ড্রপ শোল্ডার টি-শার্ট কালেকশন",
      prompt: "আপনাদের ড্রপ শোল্ডার টি-শার্ট কালেকশন দেখান",
      icon: Shirt,
      instantAnswer: `VibeLock-এর ড্রপ শোল্ডার টি-শার্টগুলো প্রিমিয়াম ২৬০ জিএসএম কম্বড কটন ফ্যাব্রিকে তৈরি, যা ট্রেন্ডি বক্সি স্ট্রিটওয়্যার ড্র্যাপ ও সর্বোচ্চ আরাম নিশ্চিত করে।

**জনপ্রিয় কালেকশন:**
- [Heavyweight Graphic Tee](/product/heavyweight-graphic-tee) - ৳৯৯০ (স্টকে রয়েছে)
- [Drop Shoulder Plain Tee](/product/t-shirt) - ৳৮০০ (স্টকে রয়েছে)

আমাদের সম্পূর্ণ টি-শার্ট কালেকশন এক্সপ্লোর করতে সরাসরি ভিজিট করুন: [টি-শার্ট কালেকশন ব্রাউজ করুন](/products)`,
    },
    {
      title: "আমার কোন সাইজ লাগবে?",
      prompt: "আমার হাইট ও ওয়েট অনুযায়ী সাইজ সাজেশন চাই",
      icon: Ruler,
      instantAnswer: `সঠিক সাইজ নির্ধারণ করতে আপনার **উচ্চতা (হাইট)** এবং **ওজন (ওয়েট)** নিচে লিখে পাঠিয়ে দিন। যেমন:
> *"আমার হাইট ৫ ফুট ৮ ইঞ্চি, ওজন ৬৮ কেজি। কোন সাইজ নেব?"*

এছাড়াও আপনি যদি একটু বেশি ঢিলেঢালা স্ট্রিটওয়্যার লুক পছন্দ করেন, তাও জানাতে পারেন। আমি সঙ্গে সঙ্গে আপনার জন্য পারফেক্ট সাইজ (S / M / L / XL / XXL) নির্ধারণ করে দেব!`,
    },
    {
      title: "ডেলিভারি চার্জ ও সময় কত?",
      prompt: "ডেলিভারি চার্জ এবং ডেলিভারি হতে কত দিন সময় লাগবে?",
      icon: Truck,
      instantAnswer: `সারাদেশে দ্রুত ও নিরাপদ ডেলিভারি সুবিধা:

- **ঢাকার ভেতরে:**
  - চার্জ: **৳৬০**
  - সময়: **২৪ থেকে ৪৮ ঘণ্টা (১ – ২ কার্যদিবস)**
  - ক্যাশ অন ডেলিভারি (COD) উপলব্ধ।
- **ঢাকার বাইরে (সারাদেশের ৬৪ জেলা):**
  - চার্জ: **৳১২০**
  - সময়: **৩ থেকে ৫ কার্যদিবস** (Steadfast Courier হোম ডেলিভারি)
  - ক্যাশ অন ডেলিভারি (COD) উপলব্ধ।
- **শোরুম পিকআপ (চাটমোহর, পাবনা):**
  - চার্জ: **সম্পূর্ণ ফ্রি (৳০)** | তাৎক্ষণিক পিকআপ সুবিধা।

আপনার নির্দিষ্ট জেলা বা এরিয়া উল্লেখ করলে আমি এক্সাক্ট ডেলিভারি টাইমলাইন জানিয়ে দেব!`,
    },
    {
      title: "শোরুমের ঠিকানা কোথায়?",
      prompt: "আপনাদের শোরুমের ঠিকানা ও লোকেশন কোথায়?",
      icon: MapPin,
      instantAnswer: `আমাদের ফিজিক্যাল রিটেইল স্টোরের ঠিকানা:

📍 **VibeLock Outlet**
- **ঠিকানা:** খন্দকার মার্কেট, স্টার মোড়, চাটমোহর, পাবনা, বাংলাদেশ।
- 🗺️ **গুগল ম্যাপস লিংক:** [Google Maps-এ লোকেশন দেখুন](https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6)
- 📞 **ফোন / হোয়াটসঅ্যাপ:** 01311-333277

আপনি চাইলে সরাসরি আমাদের শোরুমে এসে ট্রায়াল দিয়ে পছন্দের পোশাক সংগ্রহ করতে পারেন!`,
    },
  ];
}

export function ChatWidget({ initialUser }: ChatWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [currentUser, setCurrentUser] = useState<ChatWidgetUser | null>(initialUser ?? null);
  const [showBadge, setShowBadge] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, sendMessage, setMessages, status, error, regenerate } = useChat();

  const isGenerating = status === "submitted" || status === "streaming";

  // Smooth entrance for teaser callout badge if not previously dismissed
  // Auto-dismisses after 10 seconds if user does not interact with it
  useEffect(() => {
    try {
      if (sessionStorage.getItem("vl_chat_badge_dismissed") === "1") {
        return;
      }
    } catch {}

    let fadeOutTimer: NodeJS.Timeout | null = null;

    const entranceTimer = setTimeout(() => {
      setShowBadge(true);
      requestAnimationFrame(() => {
        setBadgeVisible(true);
      });

      // Auto-close after 10s if user does not close it manually
      autoCloseTimerRef.current = setTimeout(() => {
        setBadgeVisible(false);
        fadeOutTimer = setTimeout(() => {
          setShowBadge(false);
        }, 300);
        try {
          sessionStorage.setItem("vl_chat_badge_dismissed", "1");
        } catch {}
      }, 10000);
    }, 600);

    return () => {
      clearTimeout(entranceTimer);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (fadeOutTimer) clearTimeout(fadeOutTimer);
    };
  }, []);

  const handleOpenChat = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setIsOpen(true);
    setBadgeVisible(false);
    setShowBadge(false);
  };

  const handleDismissBadge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setBadgeVisible(false);
    setTimeout(() => setShowBadge(false), 300);
    try {
      sessionStorage.setItem("vl_chat_badge_dismissed", "1");
    } catch {}
  };

  // Re-synchronize session if needed
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {});
  }, [initialUser]);

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

  // Instant local response without Gemini API call for common starter prompts
  const handleQuickPrompt = (promptText: string, instantAnswer: string) => {
    if (isGenerating) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: promptText }],
      },
      {
        id: `asst-${Date.now() + 1}`,
        role: "assistant",
        parts: [{ type: "text", text: instantAnswer }],
      },
    ]);
  };

  const suggestedPrompts = getSuggestedPrompts(!!currentUser);

  return (
    <div
      className="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-label="VibeLock AI Assistant"
    >
      {/* ── 1. Floating Trigger Button & Animated Dismissible Badge ── */}
      {!isOpen && (
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Animated Dismissible Callout Badge */}
          {showBadge && (
            <div
              role="status"
              onClick={handleOpenChat}
              className={`group/badge rounded-card border-vl-dark-700 bg-vl-dark-900/95 hover:border-vl-cyan-500/50 hover:shadow-cyan-glow-sm relative flex max-w-[210px] cursor-pointer items-start gap-2 border p-2.5 shadow-2xl backdrop-blur-md transition-all duration-300 sm:p-3 ${
                badgeVisible
                  ? "translate-x-0 scale-100 opacity-100"
                  : "pointer-events-none translate-x-3 scale-95 opacity-0"
              }`}
            >
              <div className="bg-vl-cyan-500/10 text-vl-cyan-400 border-vl-cyan-500/30 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border">
                <Sparkles className="size-3.5" />
              </div>
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-vl-white-100 group-hover/badge:text-vl-cyan-300 text-xs font-bold transition-colors">
                    AI Support
                  </span>
                  <span className="bg-vl-cyan-500/15 text-vl-cyan-400 border-vl-cyan-500/30 text-3xs rounded-xs border px-1 py-0.5 font-mono font-semibold uppercase">
                    24/7
                  </span>
                </div>
                <p className="text-vl-dark-300 text-2xs mt-1 leading-snug">
                  অর্ডার ট্র্যাকিং ও সাইজ গাইড নিয়ে যেকোনো প্রশ্ন করুন!
                </p>
              </div>

              {/* Close Button (Kete debar button) */}
              <button
                type="button"
                onClick={handleDismissBadge}
                className="text-vl-dark-400 hover:text-vl-white-100 hover:bg-vl-dark-800 absolute top-1.5 right-1.5 cursor-pointer rounded-xs p-1 transition-colors"
                aria-label="বার্তাটি বন্ধ করুন"
              >
                <X className="size-3" />
              </button>

              {/* Speech bubble pointer pointing right towards the FAB */}
              <div
                className="border-vl-dark-700 bg-vl-dark-900 group-hover/badge:border-vl-cyan-500/50 absolute top-1/2 -right-1.5 size-2.5 -translate-y-1/2 rotate-45 border-t border-r transition-colors"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Compact Circular Floating Action Button */}
          <button
            type="button"
            onClick={handleOpenChat}
            className="group border-vl-dark-700 bg-vl-dark-900/95 text-vl-white-50 hover:border-vl-cyan-500/60 hover:bg-vl-dark-800 hover:shadow-cyan-glow-sm focus-visible:ring-vl-cyan-500 relative flex size-12 cursor-pointer items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:outline-none active:scale-95 sm:size-14"
            aria-label="Open VibeLock AI Chat Assistant"
          >
            <div className="relative flex items-center justify-center">
              <BotMessageSquare className="text-vl-cyan-400 size-5 transition-transform duration-200 group-hover:scale-110 sm:size-6" />
              {/* Live Status Ping */}
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="bg-vl-cyan-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
                <span className="bg-vl-cyan-400 border-vl-dark-900 relative inline-flex size-2.5 rounded-full border-2" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── 2. Expanded Chat Window ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="VibeLock AI Assistant Dialog"
          className={`rounded-brand border-vl-dark-700 bg-vl-dark-900 text-vl-white-100 flex flex-col border shadow-2xl transition-all duration-300 ease-in-out ${
            isExpanded
              ? "h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] w-[calc(100vw-2rem)] sm:h-[680px] sm:max-h-[88vh] sm:w-[640px] sm:max-w-2xl"
              : "h-135 max-h-[calc(100dvh-6.5rem)] w-[calc(100vw-2rem)] max-w-sm sm:max-h-[82vh] sm:w-96 sm:max-w-md"
          }`}
        >
          {/* Header */}
          <div className="border-vl-dark-800 bg-vl-dark-950 rounded-t-brand flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-brand bg-vl-cyan-500/10 text-vl-cyan-400 border-vl-cyan-500/20 flex size-8 items-center justify-center border">
                <Bot className="size-4.5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-vl-white-100 flex items-center gap-1.5 text-sm font-bold">
                  VibeLock Assistant
                  <span className="bg-vl-cyan-500/10 text-3xs text-vl-cyan-400 border-vl-cyan-500/30 inline-flex items-center rounded-xs border px-1 py-0.5 font-semibold">
                    AI
                  </span>
                </h3>
                <p className="text-vl-dark-400 text-2xs">অনলাইন সহায়তা ও অর্ডার ট্র্যাকিং</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded-brand text-vl-dark-400 hover:bg-vl-dark-800 hover:text-vl-white-100 focus-visible:ring-vl-cyan-500 flex size-8 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={
                  isExpanded ? "চ্যাটবক্স ছোট করুন (Minimize)" : "চ্যাটবক্স বড় করুন (Maximize)"
                }
                title={isExpanded ? "ছোট করুন" : "বড় করুন"}
              >
                {isExpanded ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-brand text-vl-dark-400 hover:bg-vl-dark-800 hover:text-vl-white-100 focus-visible:ring-vl-cyan-500 flex size-8 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Close Chat Assistant"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-4 py-1">
                {/* Greeting Header */}
                <div className="space-y-2 text-center">
                  <div className="bg-vl-cyan-500/10 text-vl-cyan-400 border-vl-cyan-500/20 mx-auto flex size-10 items-center justify-center rounded-full border">
                    <Sparkles className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-vl-white-100 text-sm font-bold sm:text-base">
                      {currentUser?.name ? `স্বাগতম ${currentUser.name}!` : "স্বাগতম VibeLock-এ!"}
                    </p>
                    <p
                      className={`text-vl-dark-300 mx-auto text-xs leading-relaxed ${
                        isExpanded ? "max-w-md" : "max-w-70"
                      }`}
                    >
                      {currentUser
                        ? "আপনার অ্যাকাউন্টের অর্ডার ট্র্যাকিং, সাইজ গাইড বা যেকোনো তথ্যের জন্য নিচের অপশন সিলেক্ট করুন অথবা সরাসরি প্রশ্ন লিখুন।"
                        : "অর্ডার ট্র্যাকিং, সাইজ গাইড বা যেকোনো তথ্যের জন্য নিচের অপশন সিলেক্ট করুন অথবা সরাসরি প্রশ্ন লিখুন।"}
                    </p>
                  </div>
                </div>

                {/* Suggested Prompts Section */}
                <div className="space-y-2 pt-1">
                  <p className="text-vl-dark-300 px-0.5 text-xs font-semibold tracking-wider uppercase">
                    সচরাচর জিজ্ঞাসিত প্রশ্ন:
                  </p>
                  <div
                    className={
                      isExpanded ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2"
                    }
                  >
                    {suggestedPrompts.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickPrompt(item.prompt, item.instantAnswer)}
                          disabled={isGenerating}
                          className="group border-vl-dark-800 bg-vl-dark-950/80 hover:border-vl-cyan-500/40 hover:bg-vl-dark-800/90 rounded-brand flex cursor-pointer items-center justify-between border px-3 py-2.5 text-left shadow-xs transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="bg-vl-cyan-500/10 text-vl-cyan-400 group-hover:bg-vl-cyan-500/20 border-vl-cyan-500/20 flex size-7 shrink-0 items-center justify-center rounded-xs border transition-colors">
                              <Icon className="size-4" />
                            </div>
                            <span className="text-vl-white-100 group-hover:text-vl-cyan-300 text-xs font-medium transition-colors">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-vl-dark-400 group-hover:text-vl-cyan-400 text-xs transition-colors">
                            →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="bg-vl-cyan-500/10 text-vl-cyan-400 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Bot className="size-3.5" />
                  </div>
                )}
                <div
                  className={`rounded-brand px-3.5 py-2.5 text-sm leading-relaxed ${
                    isExpanded ? "max-w-[90%] sm:max-w-[80%]" : "max-w-[85%]"
                  } ${
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
                          className="bg-vl-dark-900/80 text-vl-cyan-300 border-vl-cyan-500/20 my-2 flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-xs"
                        >
                          <span
                            className={`size-2 rounded-full ${
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
                          className="bg-vl-dark-900/80 text-vl-cyan-300 border-vl-cyan-500/20 my-2 flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-xs"
                        >
                          <span
                            className={`size-2 rounded-full ${
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
                    if (part.type === "tool-recommendSize") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 text-vl-cyan-300 border-vl-cyan-500/20 my-2 flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-xs"
                        >
                          <span
                            className={`size-2 rounded-full ${
                              isComplete ? "bg-vl-cyan-400" : "bg-vl-cyan-400 animate-ping"
                            }`}
                          />
                          <span>
                            {isComplete ? "সাইজ গাইড যাচাই সম্পন্ন" : "সাইজ নির্ধারণ করা হচ্ছে..."}
                          </span>
                        </div>
                      );
                    }
                    if (part.type === "tool-getShippingEstimate") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 text-vl-cyan-300 border-vl-cyan-500/20 my-2 flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-xs"
                        >
                          <span
                            className={`size-2 rounded-full ${
                              isComplete ? "bg-vl-cyan-400" : "bg-vl-cyan-400 animate-ping"
                            }`}
                          />
                          <span>
                            {isComplete
                              ? "ডেলিভারি চার্জ হিসাব সম্পন্ন"
                              : "ডেলিভারি চার্জ হিসাব করা হচ্ছে..."}
                          </span>
                        </div>
                      );
                    }
                    if (part.type === "tool-requestHumanSupport") {
                      const isComplete = part.state === "output-available";
                      return (
                        <div
                          key={idx}
                          className="bg-vl-dark-900/80 my-2 flex items-center gap-2 rounded-xs border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-400"
                        >
                          <span
                            className={`size-2 rounded-full ${
                              isComplete ? "bg-emerald-400" : "animate-ping bg-emerald-400"
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
              <div className="text-vl-cyan-400 flex items-center gap-2 pt-1 text-xs font-medium">
                <span className="bg-vl-cyan-400 size-2 animate-ping rounded-full" />
                VibeLock Assistant ভাবছে...
              </div>
            )}

            {error && (
              <div className="rounded-brand flex flex-col gap-2 border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="font-semibold wrap-break-word">
                    {error.message === "An error occurred." ||
                    error.message?.includes("503") ||
                    error.message?.includes("high demand")
                      ? "গুগল সার্ভার এই মুহূর্তে ব্যস্ত (High Demand)। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
                      : error.message?.includes("429") || error.message?.includes("অনুরোধের সীমা")
                        ? "অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।"
                        : error.message || "একটি ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"}
                  </span>
                </div>
                {regenerate && (
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="border-vl-dark-700 bg-vl-dark-800 text-vl-cyan-300 hover:bg-vl-dark-700 hover:border-vl-cyan-500/40 flex cursor-pointer items-center justify-center gap-2 rounded-xs border py-1.5 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>আবার চেষ্টা করুন (Retry)</span>
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={handleSubmit}
            className="border-vl-dark-800 bg-vl-dark-950 rounded-b-brand flex items-center gap-2 border-t p-3 sm:p-3.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="একটি প্রশ্ন বা অর্ডার নম্বর লিখুন..."
              disabled={isGenerating}
              className="border-vl-dark-700 bg-vl-dark-900 text-vl-white-100 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan-500/50 focus-visible:ring-vl-cyan-500/20 rounded-brand flex-1 border px-3.5 py-2.5 text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="rounded-brand bg-vl-cyan-500 text-vl-dark-950 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan-500 flex size-9 cursor-pointer items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send Message"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
