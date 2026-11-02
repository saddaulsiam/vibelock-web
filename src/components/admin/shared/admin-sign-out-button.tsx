"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminSignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="h-9 gap-1.5 rounded-xl border-[#101114]/15 bg-white px-2.5 text-xs font-semibold text-[#101114]/80 shadow-2xs hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:px-3"
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

