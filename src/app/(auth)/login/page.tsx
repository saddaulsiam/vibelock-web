"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loginAction, googleSignInAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Login form state
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Feedback & Loading
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle Login Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await loginAction({ email: emailOrPhone.trim(), password });
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-2">
      {/* ══════════════════════════════════════════════════════
          HERO PHOTOGRAPHY PANEL (Split-Screen Left Column on Desktop)
          Back-view model wearing black oversized VibeLock hoodie,
          beanie, and silver chain in an urban alley.
      ══════════════════════════════════════════════════════ */}
      <div className="bg-vl-dark-900 relative hidden h-full w-full overflow-hidden lg:block">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Streetwear Model"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Subtle dark gradient overlay to blend into the right panel */}
        <div className="to-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent" />
        <div className="from-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-black/30" />

        {/* Editorial Fashion Badge */}
        <div className="absolute bottom-12 left-12 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="bg-vl-cyan size-1.5 rounded-full" />
            <span className="font-heading tracking-streetwear text-vl-white-300 text-[10px] font-bold uppercase">
              DROP 001 // DHAKA EDITION
            </span>
          </div>
          <p className="font-heading text-vl-white-300 mt-3 text-2xl font-black tracking-tight uppercase">
            WEAR THE REBELLION
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE COMPACT HERO BANNER (< lg screens)
      ══════════════════════════════════════════════════════ */}
      <div className="bg-vl-dark-900 relative h-48 w-full overflow-hidden sm:h-64 lg:hidden">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Streetwear Model"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        <div className="from-vl-dark-900 via-vl-dark-900/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-black/50" />

        {/* Mobile Top Header Links */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/"
            className="text-vl-white-300/80 hover:text-vl-cyan inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
            aria-label="Back to Home"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/"
            className="font-heading text-vl-white-300 text-lg font-black tracking-wider uppercase"
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
            href="/"
            className="group text-vl-grey hover:text-vl-white-300 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/"
            className="font-heading text-vl-white-300 hover:text-vl-cyan text-xl font-black tracking-wider uppercase transition-colors"
          >
            VIBELOCK
          </Link>
        </header>

        {/* Main Center Form */}
        <main className="mx-auto my-auto w-full max-w-md py-4 sm:py-8">
          {/* Brand Tagline & Headings */}
          <div className="space-y-1.5 text-left">
            <span className="font-heading text-vl-cyan inline-block text-[11px] font-bold tracking-[0.25em] uppercase">
              STREETWEAR FOR DHAKA YOUTH
            </span>
            <h1 className="font-heading text-vl-white-300 text-3xl font-black tracking-tight sm:text-4xl">
              Welcome Back
            </h1>
            <p className="text-vl-grey text-sm font-normal">Log in to your VibeLock account</p>
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

          {/* ── EMAIL OR PHONE + PASSWORD FORM ── */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email / Phone Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-vl-white-300 text-xs font-medium">
                Email or Phone
              </Label>
              <div className="relative">
                <Mail className="text-vl-dark-400 pointer-events-none absolute top-3.5 left-3.5 size-4" />
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email or phone"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-11 rounded-lg pl-10 text-sm focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-vl-white-300 text-xs font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="text-vl-dark-400 pointer-events-none absolute top-3.5 left-3.5 size-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
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

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="border-vl-dark-600 bg-vl-dark-800 text-vl-cyan accent-vl-cyan size-4 rounded focus:ring-0"
                />
                <span className="text-vl-dark-400 hover:text-vl-white-300 text-xs">
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-vl-cyan text-xs font-medium transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Primary Cyan Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan mt-2 h-11 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all focus-visible:ring-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>LOGGING IN...</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Social Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="border-vl-dark-600 w-full border-t" />
            </div>
            <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
              <span className="bg-vl-dark-900 text-vl-dark-400 px-3 font-semibold">OR</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <form action={googleSignInAction} className="w-full">
            <SubmitButton
              variant="outline"
              className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 hover:border-vl-dark-400/60 hover:bg-vl-dark-700 h-11 w-full gap-2.5 rounded-lg text-xs font-bold transition-all hover:text-white"
              pendingText="Connecting to Google..."
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </SubmitButton>
          </form>

          {/* Registration Link Footer */}
          <div className="text-vl-dark-400 mt-8 text-center text-xs">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-vl-cyan font-bold underline-offset-4 transition-colors hover:underline"
            >
              Register
            </Link>
          </div>
        </main>

        {/* Bottom subtle copyright / tagline */}
        <footer className="text-vl-dark-500 text-center text-[11px] lg:text-left">
          © {new Date().getFullYear()} VibeLock. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-vl-dark-900 text-vl-white-300 flex min-h-screen items-center justify-center">
          <RefreshCw className="text-vl-cyan size-6 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
