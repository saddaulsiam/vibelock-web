"use client";

import { useState } from "react";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
          className="placeholder:text-vl-white/35 min-w-0 flex-1 bg-white/5 px-3 text-xs text-white focus:outline-none"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={loading}
          loading={loading}
          className="bg-vl-cyan text-2xs hover:bg-vl-cyan h-full shrink-0 rounded-none px-4 font-extrabold tracking-wider text-[#0B0F14] uppercase hover:opacity-90"
        >
          SUBSCRIBE
        </Button>
      </div>
      <p className="text-2xs text-vl-white/35 mt-1.5">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
