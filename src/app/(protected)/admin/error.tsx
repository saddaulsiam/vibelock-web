"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error boundary caught:", error);
  }, [error]);

  return (
    <section className="flex min-h-[50vh] items-center justify-center">
      <div className="border-vl-dark-900/10 w-full max-w-lg border bg-white px-5 py-12 text-center sm:px-10">
        <AlertCircle className="text-vl-dark-900 mx-auto mb-5 size-8" aria-hidden="true" />
        <h2 className="text-vl-dark-900 text-2xl font-semibold tracking-tight">
          Dashboard unavailable
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Dashboard data could not be loaded. Please try again.
        </p>
        <Button onClick={reset} size="lg" className="mt-7">
          Try again
        </Button>
      </div>
    </section>
  );
}
