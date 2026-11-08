"use client";

import { useState } from "react";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <div className="rounded-brand flex h-9 w-11/12 overflow-hidden border border-white/10 sm:w-10/12">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          suppressHydrationWarning
          autoComplete="email"
          aria-label="Email for newsletter"
          variant="dark"
          size="sm"
          className="placeholder:text-vl-white/35 h-full min-w-0 flex-1 rounded-none border-0 bg-white/5 text-white focus-visible:ring-0"
        />
        <Button
          type="submit"
          variant="brand"
          size="sm"
          disabled={loading}
          loading={loading}
          className="text-vl-dark-900 h-full rounded-none font-medium tracking-wider hover:opacity-90"
        >
          Subscribe
        </Button>
      </div>
      <p className="text-2xs text-vl-white/35 mt-1.5">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
