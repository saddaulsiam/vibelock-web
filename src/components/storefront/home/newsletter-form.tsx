"use client";

import { useState } from "react";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function StorefrontNewsletterForm() {
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
        source: "STOREFRONT_HOMEPAGE",
      });
      if (res.success) {
        toast.success(res.message || "You're on the list! Welcome to the VibeLock crew.");
        setEmail("");
      } else {
        toast.error(res.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col items-start gap-1.5 sm:max-w-md md:items-end"
    >
      <div className="flex w-full items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          suppressHydrationWarning
          autoComplete="email"
          aria-label="Email address for newsletter"
          className="h-10 w-full rounded-full border border-white/15 bg-[#1A1D21] px-4 text-xs text-white placeholder:text-[#F3F0E8]/40 focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#00D9FF] px-6 py-2.5 text-xs font-extrabold tracking-wider text-[#101114] uppercase transition-all hover:bg-[#00c4e6] active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "SUBSCRIBE"}
        </button>
      </div>
      <span className="text-[10px] text-[#F3F0E8]/45">
        No spam ever. Unsubscribe at any time with one click.
      </span>
    </form>
  );
}
