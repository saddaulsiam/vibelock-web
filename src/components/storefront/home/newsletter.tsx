"use client";

import { useState } from "react";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await subscribeNewsletterAction({
        email,
        source: "STOREFRONT_FOOTER",
      });
      if (res.success) {
        toast.success(res.message || "You're on the list!");
        setEmail("");
      } else {
        toast.error(res.error || "Failed to subscribe. Try again.");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 w-full">
      <div className="flex h-9 w-11/12 overflow-hidden rounded-sm border border-white/10 sm:w-10/12">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          suppressHydrationWarning
          autoComplete="email"
          aria-label="Email for newsletter"
          className="min-w-0 flex-1 bg-white/5 px-3 text-xs text-white placeholder:text-[#F3F0E8]/35 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 cursor-pointer bg-[#00D9FF] px-4 text-[10px] font-extrabold tracking-wider text-[#0B0F14] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : "SUBSCRIBE"}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[#F3F0E8]/35">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
