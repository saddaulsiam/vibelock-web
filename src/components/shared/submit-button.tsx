"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { type ComponentPropsWithoutRef } from "react";

interface SubmitButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  pendingText?: string;
}

export function SubmitButton({
  children,
  pendingText = "Submitting...",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
