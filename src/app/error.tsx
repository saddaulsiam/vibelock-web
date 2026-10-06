"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-muted-foreground">
          We apologize for the inconvenience. Our team has been notified.
        </p>
      </div>
      <Button onClick={() => reset()} variant="default">
        Try again
      </Button>
    </div>
  );
}
