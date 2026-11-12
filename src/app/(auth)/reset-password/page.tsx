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
          <h2 className="font-heading text-vl-white-300 text-2xl font-black tracking-tight">
            Invalid Reset Link
          </h2>
          <p className="text-vl-dark-400 text-xs">
            This password reset link is invalid or has expired. Please request a new link.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 mt-2 h-11 w-full rounded-lg text-xs font-black tracking-widest uppercase">
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
        <span className="font-heading text-vl-cyan inline-block text-[11px] font-bold tracking-[0.25em] uppercase">
          SECURITY // ACCOUNT ACCESS
        </span>
        <h1 className="font-heading text-vl-white-300 text-3xl font-black tracking-tight sm:text-4xl">
          Set New Password
        </h1>
        <p className="text-vl-dark-400 text-sm font-normal">
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
          className="border-vl-cyan-200 bg-vl-cyan-50 text-vl-white-300 mt-5 flex items-start gap-2.5 rounded-lg border p-3.5 text-xs font-medium"
        >
          <CheckCircle2 className="text-vl-cyan mt-0.5 size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-vl-white-300 text-xs font-medium">
            New Password
          </Label>
          <div className="relative">
            <Lock className="text-vl-dark-400 pointer-events-none absolute top-3.5 left-3.5 size-4" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              required
              value={formData.newPassword}
              onChange={handleChange}
              disabled={isLoading || !!success}
              autoComplete="new-password"
              className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-11 rounded-lg pr-10 pl-10 text-sm focus-visible:ring-1"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="text-vl-dark-400 hover:text-vl-white-300 absolute top-3.5 right-3 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmNewPassword" className="text-vl-white-300 text-xs font-medium">
            Confirm New Password
          </Label>
          <div className="relative">
            <Lock className="text-vl-dark-400 pointer-events-none absolute top-3.5 left-3.5 size-4" />
            <Input
              id="confirmNewPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your new password"
              required
              value={formData.confirmNewPassword}
              onChange={handleChange}
              disabled={isLoading || !!success}
              autoComplete="new-password"
              className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-11 rounded-lg pl-10 text-sm focus-visible:ring-1"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !!success}
          className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan mt-2 h-11 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all focus-visible:ring-2"
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
      <div className="bg-vl-dark-900 relative hidden h-full w-full overflow-hidden lg:block">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Reset Password Image"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        <div className="to-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent" />
        <div className="from-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-black/30" />

        <div className="absolute bottom-10 left-10 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="bg-vl-cyan size-1.5 rounded-full" />
            <span className="font-heading tracking-streetwear text-vl-white-300 text-[10px] font-bold uppercase">
              SECURITY // ACCESS
            </span>
          </div>
          <p className="font-heading text-vl-white-300 mt-3 text-2xl font-black tracking-tight uppercase">
            REGAIN YOUR VIBELOCK ACCESS
          </p>
        </div>
      </div>

      {/* Mobile Compact Hero Banner */}
      <div className="bg-vl-dark-900 relative h-44 w-full overflow-hidden sm:h-56 lg:hidden">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Reset Password Image"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
        />
        <div className="from-vl-dark-900 via-vl-dark-900/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-black/50" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/login"
            className="text-vl-white-300/80 hover:text-vl-cyan inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
            aria-label="Back to Login"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Login</span>
          </Link>
          <Link
            href="/"
            className="font-heading text-vl-white-300 text-lg font-black tracking-wider uppercase"
          >
            VIBELOCK
          </Link>
        </div>
      </div>

      {/* Right Column Content */}
      <div className="flex min-h-[calc(100vh-11rem)] w-full flex-col justify-between p-6 sm:p-10 lg:min-h-screen lg:p-12 xl:p-16">
        <header className="hidden items-center justify-between lg:flex">
          <Link
            href="/login"
            className="group text-vl-dark-400 hover:text-vl-white-300 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Login</span>
          </Link>

          <Link
            href="/"
            className="font-heading text-vl-white-300 hover:text-vl-cyan text-xl font-black tracking-wider uppercase transition-colors"
          >
            VIBELOCK
          </Link>
        </header>

        <main className="mx-auto my-auto w-full max-w-md py-6 sm:py-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="text-vl-cyan size-6 animate-spin" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </main>

        <footer className="text-vl-dark-500 text-center text-[11px] lg:text-left">
          © {new Date().getFullYear()} VibeLock. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
