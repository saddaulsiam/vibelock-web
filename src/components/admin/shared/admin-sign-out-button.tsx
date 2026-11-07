"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminSignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
      className="gap-1.5"
      title="Sign out of Operations"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin text-red-600" aria-hidden="true" />
      ) : (
        <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden md:inline">{pending ? "Signing out..." : "Sign out"}</span>
    </Button>
  );
}
