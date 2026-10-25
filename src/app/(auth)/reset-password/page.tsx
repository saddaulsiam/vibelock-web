"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/account-security";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Lock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-heading text-2xl font-black tracking-tight text-[#F3F0E8]">
            Invalid Reset Link
          </h2>
          <p className="text-xs text-[#777982]">
            This password reset link is invalid or has expired. Please request a new link.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="font-heading mt-2 h-11 w-full rounded-lg bg-[#00D9FF] text-xs font-black tracking-widest text-[#101114] uppercase hover:bg-[#00D9FF]/90">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const res = await resetPasswordAction({
      token,
      newPassword: formData.newPassword,
      confirmNewPassword: formData.confirmNewPassword,
    });

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setSuccess("Your password has been successfully reset. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    if (error) setError("");
  };

  return (
    <div>
      {/* Brand Tagline & Headings */}
      <div className="space-y-1.5 text-left">
        <span className="font-heading inline-block text-[11px] font-bold tracking-[0.25em] text-[#00D9FF] uppercase">
          SECURITY // ACCOUNT ACCESS
        </span>
        <h1 className="font-heading text-3xl font-black tracking-tight text-[#F3F0E8] sm:text-4xl">
          Set New Password
        </h1>
        <p className="text-sm font-normal text-[#777982]">
          Enter your new password below to secure your VibeLock account.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#00D9FF]/30 bg-[#00D9FF]/10 p-3.5 text-xs font-medium text-[#F3F0E8]"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#00D9FF]" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs font-medium text-[#F3F0E8]">
            New Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-[#777982]" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              required
              value={formData.newPassword}
              onChange={handleChange}
              disabled={isLoading || !!success}
              autoComplete="new-password"
              className="h-11 rounded-lg border-[#303137] bg-[#16171B] pr-10 pl-10 text-sm text-[#F3F0E8] placeholder:text-[#5E606A] focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF]/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute top-3.5 right-3 text-[#777982] transition-colors hover:text-[#F3F0E8]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmNewPassword" className="text-xs font-medium text-[#F3F0E8]">
            Confirm New Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-[#777982]" />
            <Input
              id="confirmNewPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your new password"
              required
              value={formData.confirmNewPassword}
              onChange={handleChange}
              disabled={isLoading || !!success}
              autoComplete="new-password"
              className="h-11 rounded-lg border-[#303137] bg-[#16171B] pl-10 text-sm text-[#F3F0E8] placeholder:text-[#5E606A] focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF]/30"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !!success}
          className="font-heading mt-2 h-11 w-full gap-2 rounded-lg bg-[#00D9FF] text-xs font-black tracking-widest text-[#101114] uppercase transition-all hover:bg-[#00D9FF]/90 focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
        >
          {isLoading ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>SAVING PASSWORD...</span>
            </>
          ) : (
            <>
              <span>Save Password</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-2">
      {/* Hero Photography Panel (Left Column) */}
      <div className="relative hidden h-full w-full overflow-hidden bg-[#0c0d10] lg:block">
        <Image
          src="/images/login-back-model.png"
          alt="VibeLock Streetwear Campaign - Dhaka Youth"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#101114]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101114] via-transparent to-black/30" />

        <div className="absolute bottom-10 left-10 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[#00D9FF]" />
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-[#F3F0E8] uppercase">
              SECURITY // ACCESS
            </span>
          </div>
          <p className="font-heading mt-3 text-2xl font-black tracking-tight text-[#F3F0E8] uppercase">
            REGAIN YOUR VIBELOCK ACCESS
          </p>
        </div>
      </div>

      {/* Mobile Compact Hero Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-[#0c0d10] sm:h-56 lg:hidden">
        <Image
          src="/images/login-back-model.png"
          alt="VibeLock Streetwear Campaign"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101114] via-[#101114]/40 to-black/50" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3F0E8]/80 transition-colors hover:text-[#00D9FF]"
            aria-label="Back to Login"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Login</span>
          </Link>
          <Link href="/" className="font-heading text-lg font-black tracking-wider text-[#F3F0E8] uppercase">
            VIBELOCK
          </Link>
        </div>
      </div>

      {/* Right Column Content */}
      <div className="flex min-h-[calc(100vh-11rem)] w-full flex-col justify-between p-6 sm:p-10 lg:min-h-screen lg:p-12 xl:p-16">
        <header className="hidden items-center justify-between lg:flex">
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#777982] transition-colors hover:text-[#F3F0E8]"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Login</span>
          </Link>

          <Link
            href="/"
            className="font-heading text-xl font-black tracking-wider text-[#F3F0E8] uppercase transition-colors hover:text-[#00D9FF]"
          >
            VIBELOCK
          </Link>
        </header>

        <main className="mx-auto my-auto w-full max-w-md py-6 sm:py-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="size-6 animate-spin text-[#00D9FF]" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </main>

        <footer className="text-center text-[11px] text-[#5E606A] lg:text-left">
          © {new Date().getFullYear()} VibeLock. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
