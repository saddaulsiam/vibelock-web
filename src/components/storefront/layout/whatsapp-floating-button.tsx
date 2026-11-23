"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  Send,
  Sparkles,
  ChevronRight,
  Ruler,
  Palette,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { getWhatsAppNumber } from "@/lib/config/contact";

interface QuickPrompt {
  id: string;
  Icon: LucideIcon;
  label: string;
  message: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "size",
    Icon: Ruler,
    label: "সাইজ ও ফিটিং কনফিউশন?",
    message: "আসসালামু আলাইকুম, আমি এই পোশাকের সঠিক সাইজ এবং ফিটিং সম্পর্কে নিশ্চিত হতে চাই।",
  },
  {
    id: "color",
    Icon: Palette,
    label: "কালার ও ফেব্রিক কোয়ালিটি",
    message: "আসসালামু আলাইকুম, এই প্রোডাক্টের কাপড় ও আসল কালার সম্পর্কে জানতে চাই।",
  },
  {
    id: "order",
    Icon: ShoppingBag,
    label: "সরাসরি হোয়াটসঅ্যাপে অর্ডার",
    message: "আসসালামু আলাইকুম, আমি সরাসরি হোয়াটসঅ্যাপে অর্ডার কনফার্ম করতে চাই।",
  },
];

export function WhatsAppFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPillDismissed, setIsPillDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const dismissPill = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPillDismissed(true);
  };

  // Close on Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape Key & Focus Trap/Focus Restore
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Accessibility: focus the close button when dialog opens
      closeButtonRef.current?.focus();
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Build Contextual WhatsApp URL
  const buildWhatsAppUrl = (customText?: string) => {
    let baseText = customText || "আসসালামু আলাইকুম, VibeLock থেকে প্রোডাক্ট সম্পর্কে জানতে চাই।";

    // Append current page context if browsing a product or catalog
    if (typeof window !== "undefined") {
      const currentUrl = window.location.href;
      if (pathname && pathname.startsWith("/product/")) {
        baseText += `\n\n(প্রোডাক্ট রেফারেন্স: ${currentUrl})`;
      }
    }

    return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(baseText)}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      aria-label="WhatsApp Support Widget"
    >
      {/* ── 1. Expanded WhatsApp Chat Popover Card ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-card-title"
          className="bg-vl-white-50 border-vl-white-500 rounded-brand animate-in fade-in slide-in-from-bottom-4 mb-3 w-[calc(100vw-2rem)] max-w-sm border shadow-2xl transition-all duration-200 motion-reduce:animate-none sm:w-88"
        >
          {/* Card Header */}
          <div className="bg-vl-dark-900 rounded-t-brand flex items-center justify-between px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <Image
                  src="/icons/whatsapp.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="brightness-200"
                  aria-hidden="true"
                />
                {/* Active Online Ping */}
                <span className="absolute right-0 bottom-0 flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                </span>
              </div>
              <div className="min-w-0">
                <h3
                  id="whatsapp-card-title"
                  className="font-heading text-sm font-black tracking-wider text-white uppercase"
                >
                  VibeLock Support
                </h3>
                <p className="text-2xs flex items-center gap-1 font-medium text-emerald-400">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
                  সরাসরি অনলাইন সহায়তা
                </p>
              </div>
            </div>

            {/* Close Button - Minimum 44px target with padding */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-brand focus-visible:ring-vl-cyan-400 -mr-1 flex size-9 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Close WhatsApp chat card"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-4">
            {/* Friendly Greeting Message */}
            <div className="bg-vl-white-100 border-vl-white-400 text-vl-dark-900 rounded-brand border p-3 text-xs leading-relaxed">
              <p className="flex items-center gap-1.5 font-bold">
                <Sparkles className="text-vl-cyan-700 size-3.5 shrink-0" aria-hidden="true" />
                আসসালামু আলাইকুম!
              </p>
              <p className="text-vl-dark-500 mt-1">
                পোশাকের সঠিক সাইজ, কালার বা অর্ডার নিয়ে প্রশ্ন থাকলে সরাসরি মেসেজ দিন। আমাদের টিম
                সাধারণত ২-৫ মিনিটে উত্তর দেয়।
              </p>
            </div>

            {/* Quick Prompt Pills */}
            <div className="mt-3.5 space-y-2">
              <p className="text-vl-dark-500 text-2xs font-extrabold tracking-wider uppercase">
                দ্রুত প্রশ্ন সিলেক্ট করুন:
              </p>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <a
                    key={prompt.id}
                    href={buildWhatsAppUrl(prompt.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="border-vl-white-500 bg-vl-white-50 hover:bg-vl-white-200 text-vl-dark-900 group rounded-brand focus-visible:ring-vl-cyan-500 flex min-h-10.5 items-center justify-between border px-3 py-2 text-xs font-semibold transition-all hover:border-emerald-500/40 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="bg-vl-white-200 text-vl-dark-700 rounded-brand flex size-6 shrink-0 items-center justify-center transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        <prompt.Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span>{prompt.label}</span>
                    </span>
                    <ChevronRight
                      className="text-vl-dark-400 group-hover:text-vl-dark-900 size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </div>

            {/* Direct General Chat Button */}
            <div className="mt-4 pt-1">
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="font-heading rounded-brand flex min-h-11 w-full items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 text-xs font-black tracking-widest text-white uppercase shadow-md transition-all hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
              >
                <Send className="size-3.5" aria-hidden="true" />
                <span>সরাসরি চ্যাট শুরু করুন</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. The Main Floating WhatsApp Bubble ── */}
      <div className="flex items-center justify-end gap-2.5">
        {/* Subtle Text Tooltip / Pill on Desktop */}
        {!isOpen && !isPillDismissed && (
          <div className="border-vl-white-500 bg-vl-white-50 text-vl-dark-900 rounded-brand hidden items-center gap-1.5 border py-1.5 pr-1.5 pl-3 text-xs font-bold shadow-lg transition-all duration-200 hover:border-emerald-500/40 hover:shadow-xl sm:flex">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="focus-visible:ring-vl-cyan-500 rounded-brand flex cursor-pointer items-center gap-2 select-none focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Open WhatsApp support assistant"
            >
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>সাইজ বা অর্ডার সহায়তা?</span>
            </button>
            <button
              type="button"
              onClick={dismissPill}
              className="text-vl-dark-400 hover:text-vl-dark-900 hover:bg-vl-white-200 focus-visible:ring-vl-cyan-500 flex size-6 cursor-pointer items-center justify-center rounded-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Dismiss message"
              title="Close"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Floating Round Action Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`focus-visible:ring-vl-cyan-500 relative flex size-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 sm:size-12 ${
            isOpen
              ? "bg-vl-dark-900 hover:bg-vl-dark-800 text-white"
              : "bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-emerald-600/30"
          }`}
          aria-label={isOpen ? "Close WhatsApp chat" : "Chat with us on WhatsApp"}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {isOpen ? (
            <X className="size-5 rotate-90 transition-transform duration-200" aria-hidden="true" />
          ) : (
            <>
              {/* Pulsing Active Ring */}
              <span className="absolute -inset-1 -z-10 animate-pulse rounded-full bg-emerald-500/30 motion-reduce:animate-none" />
              <Image
                src="/icons/whatsapp.svg"
                alt=""
                width={34}
                height={34}
                className="brightness-200 transition-transform duration-200 hover:scale-105"
                aria-hidden="true"
              />
              {/* Online Green Indicator Dot */}
              <span className="border-vl-white-50 absolute top-0 right-0.5 flex size-3 rounded-full border-2 bg-emerald-400 shadow-xs" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
