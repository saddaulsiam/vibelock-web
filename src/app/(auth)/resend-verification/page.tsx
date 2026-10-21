"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resendVerificationAction } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type FormValues = z.infer<typeof formSchema>;

export default function ResendVerificationPage() {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: FormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await resendVerificationAction(data);
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setIsSuccess(true);
        toast.success("Verification email sent");
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Resend Verification</CardTitle>
        <CardDescription>
          Enter your email address and we will send you a new verification link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
            <div className="text-sm">
              If the account can receive verification email, a new verification link has been sent.
              Please check your inbox.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive border-destructive/20 rounded-lg border p-4">
                <div className="text-sm">{error}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
                disabled={isPending}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending..." : "Send Verification Link"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground w-full text-center text-sm">
          Remember your password?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
