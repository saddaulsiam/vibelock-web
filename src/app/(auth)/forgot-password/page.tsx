"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/account-security";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, RefreshCw, AlertCircle, ChevronLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const res = await forgotPasswordAction({ email: email.trim() });

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(
        "We have sent a password reset link to your email. Please check your inbox and spam folder."
      );
      setEmail("");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-2">
      {/* ══════════════════════════════════════════════════════
          HERO PHOTOGRAPHY PANEL (Split-Screen Left Column on Desktop)
      ══════════════════════════════════════════════════════ */}
      <div className="relative hidden h-full w-full overflow-hidden bg-[#0c0d10] lg:block">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Forgot Password Page Image"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Subtle dark gradient overlay to blend into the right panel */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#101114]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101114] via-transparent to-black/30" />

        {/* Editorial Fashion Badge */}
        <div className="absolute bottom-10 left-10 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[#00D9FF]" />
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-[#F3F0E8] uppercase">
              SECURITY // ACCOUNT ACCESS
            </span>
          </div>
          <p className="font-heading mt-3 text-2xl font-black tracking-tight text-[#F3F0E8] uppercase">
            REGAIN YOUR VIBELOCK ACCESS
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE COMPACT HERO BANNER (< lg screens)
      ══════════════════════════════════════════════════════ */}
      <div className="relative h-44 w-full overflow-hidden bg-[#0c0d10] sm:h-56 lg:hidden">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Forgot Password Page Image"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101114] via-[#101114]/40 to-black/50" />

        {/* Mobile Top Header Links */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3F0E8]/80 transition-colors hover:text-[#00D9FF]"
            aria-label="Back to Login"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Login</span>
          </Link>
          <Link
            href="/"
            className="font-heading text-lg font-black tracking-wider text-[#F3F0E8] uppercase"
          >
            VIBELOCK
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          AUTHENTICATION FORM PANEL (Right Column)
      ══════════════════════════════════════════════════════ */}
      <div className="flex min-h-[calc(100vh-11rem)] w-full flex-col justify-between p-6 sm:p-10 lg:min-h-screen lg:p-12 xl:p-16">
        {/* Desktop Top Header Bar */}
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

        {/* Main Center Form */}
        <main className="mx-auto my-auto w-full max-w-md py-6 sm:py-10">
          {/* Brand Tagline & Headings */}
          <div className="space-y-1.5 text-left">
            <span className="font-heading inline-block text-[11px] font-bold tracking-[0.25em] text-[#00D9FF] uppercase">
              STREETWEAR FOR DHAKA YOUTH
            </span>
            <h1 className="font-heading text-3xl font-black tracking-tight text-[#F3F0E8] sm:text-4xl">
              Forgot Password
            </h1>
            <p className="text-sm font-normal text-[#777982]">
              Enter your registered email address and we&apos;ll send you a password reset link.
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

          {/* Success Message Banner */}
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
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-[#F3F0E8]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-[#777982]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 rounded-lg border-[#303137] bg-[#16171B] pl-10 text-sm text-[#F3F0E8] placeholder:text-[#5E606A] focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF]/30"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="font-heading mt-2 h-11 w-full gap-2 rounded-lg bg-[#00D9FF] text-xs font-black tracking-widest text-[#101114] uppercase transition-all hover:bg-[#00D9FF]/90 focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>SENDING LINK...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Back to Login Link */}
          <div className="mt-8 text-center text-xs text-[#777982]">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-bold text-[#00D9FF] underline-offset-4 transition-colors hover:underline"
            >
              Log in
            </Link>
          </div>
        </main>

        {/* Bottom subtle copyright / tagline */}
        <footer className="text-center text-[11px] text-[#5E606A] lg:text-left">
          © {new Date().getFullYear()} VibeLock. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
