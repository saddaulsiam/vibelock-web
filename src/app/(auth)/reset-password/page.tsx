"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/account-security";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <CardContent className="pt-6 text-center">
        <div className="text-destructive mb-4 font-medium">Invalid or missing reset token.</div>
        <Link href="/forgot-password">
          <Button variant="outline">Request new token</Button>
        </Link>
      </CardContent>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (formData.newPassword !== formData.confirmNewPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const res = await resetPasswordAction({
      token,
      newPassword: formData.newPassword,
      confirmNewPassword: formData.confirmNewPassword,
    });

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setSuccess("Your password has been successfully reset. You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        {error && <div className="text-destructive text-center text-sm font-medium">{error}</div>}
        {success && (
          <div className="text-center text-sm font-medium text-emerald-600">{success}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            required
            value={formData.newPassword}
            onChange={handleChange}
            disabled={isLoading || !!success}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
          <Input
            id="confirmNewPassword"
            type="password"
            required
            value={formData.confirmNewPassword}
            onChange={handleChange}
            disabled={isLoading || !!success}
            autoComplete="new-password"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={isLoading || !!success}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </Button>
      </CardFooter>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <Suspense fallback={<CardContent className="py-4 text-center">Loading...</CardContent>}>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  );
}
