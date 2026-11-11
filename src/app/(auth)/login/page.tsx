"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  loginAction,
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
  googleSignInAction,
} from "@/app/actions/auth";
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
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Auth method: "email" (matches primary design mockup) or "phone" (OTP flow)
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  // Email / Password state
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback & Loading
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first OTP field on send
  useEffect(() => {
    if (otpSent && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [otpSent]);

  // Handle Email + Password Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError("Please enter your email address.");
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

  // Handle Send Phone OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      setError("Please enter a valid 11-digit Bangladeshi mobile number.");
      return;
    }

    setIsLoading(true);
    setError("");

    const res = await sendPhoneOtpAction({ phone });
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setOtpSent(true);
      setCountdown(60);
      if (res?.devOtp) setDevOtp(res.devOtp);
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (val && index === 5 && newDigits.every((d) => d !== "")) {
      triggerVerifyOtp(newDigits.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(paste)) {
      const chars = paste.split("");
      setOtpDigits(chars);
      otpInputRefs.current[5]?.focus();
      triggerVerifyOtp(paste);
    }
  };

  const handleAutoFillDevOtp = () => {
    if (!devOtp || devOtp.length !== 6) return;
    setOtpDigits(devOtp.split(""));
    triggerVerifyOtp(devOtp);
  };

  const triggerVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError("");

    const res = await verifyPhoneOtpAction({ phone, otp: code });
    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-2">
      {/* ══════════════════════════════════════════════════════
          HERO PHOTOGRAPHY PANEL (Split-Screen Left Column on Desktop)
          Back-view model wearing black oversized VibeLock T-shirt
          with the large white VibeLock back logo.
      ══════════════════════════════════════════════════════ */}
      <div className="relative hidden h-full w-full overflow-hidden bg-vl-dark-900 lg:block">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Login Page Image"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Subtle dark gradient overlay to blend into the right panel */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-vl-dark-900" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-vl-dark-900 via-transparent to-black/30" />

        {/* Editorial Fashion Badge */}
        <div className="absolute bottom-10 left-10 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-vl-cyan" />
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-vl-white-300 uppercase">
              DHAKA STREETWEAR // EDITION 2026
            </span>
          </div>
          <p className="font-heading mt-3 text-2xl font-black tracking-tight text-vl-white-300 uppercase">
            BUILT FOR REAL MOVEMENT
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE COMPACT HERO BANNER (< lg screens)
      ══════════════════════════════════════════════════════ */}
      <div className="relative h-44 w-full overflow-hidden bg-vl-dark-900 sm:h-56 lg:hidden">
        <Image
          src="/images/auth/login-back-model.png"
          alt="VibeLock Login Page Image"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-vl-dark-900 via-vl-dark-900/40 to-black/50" />

        {/* Mobile Top Header Links */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-vl-white-300/80 transition-colors hover:text-vl-cyan"
            aria-label="Back to Home"
          >
            <ChevronLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/"
            className="font-heading text-lg font-black tracking-wider text-vl-white-300 uppercase"
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
            className="group text-vl-grey inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-vl-white-300"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/"
            className="font-heading text-xl font-black tracking-wider text-vl-white-300 uppercase transition-colors hover:text-vl-cyan"
          >
            VIBELOCK
          </Link>
        </header>

        {/* Main Center Form */}
        <main className="mx-auto my-auto w-full max-w-md py-4 sm:py-8">
          {/* Brand Tagline & Headings */}
          <div className="space-y-1.5 text-left">
            <span className="font-heading inline-block text-[11px] font-bold tracking-[0.25em] text-vl-cyan uppercase">
              STREETWEAR FOR DHAKA YOUTH
            </span>
            <h1 className="font-heading text-3xl font-black tracking-tight text-vl-white-300 sm:text-4xl">
              Welcome Back
            </h1>
            <p className="text-vl-grey text-sm font-normal">Log in to your VibeLock account</p>
          </div>

          {/* Authentication Method Switcher (Minimalist streetwear pills) */}
          <div className="border-vl-border/60 mt-6 flex rounded-lg border bg-vl-dark-800 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("email");
                setError("");
              }}
              className={`flex-1 rounded-md py-2 text-center text-xs font-bold tracking-wider uppercase transition-all ${
                authMethod === "email"
                  ? "bg-vl-dark-900 text-vl-white-300 shadow-sm ring-1 ring-vl-cyan-300"
                  : "text-vl-dark-400 hover:text-vl-white-300"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("phone");
                setError("");
              }}
              className={`flex-1 rounded-md py-2 text-center text-xs font-bold tracking-wider uppercase transition-all ${
                authMethod === "phone"
                  ? "bg-vl-dark-900 text-vl-white-300 shadow-sm ring-1 ring-vl-cyan-300"
                  : "text-vl-dark-400 hover:text-vl-white-300"
              }`}
            >
              Phone OTP
            </button>
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

          {/* ── METHOD 1: EMAIL & PASSWORD (Design Mockup Default) ── */}
          {authMethod === "email" && (
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              {/* Email / Phone Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-vl-white-300">
                  Email or Phone
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-vl-dark-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or phone"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    className="h-11 rounded-lg border-vl-dark-600 bg-vl-dark-800 pl-10 text-sm text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-1 focus-visible:ring-vl-cyan-400"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-vl-white-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-vl-dark-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 rounded-lg border-vl-dark-600 bg-vl-dark-800 pr-10 pl-10 text-sm text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-1 focus-visible:ring-vl-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute top-3.5 right-3 text-vl-dark-400 transition-colors hover:text-vl-white-300"
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
                    className="size-4 rounded border-vl-dark-600 bg-vl-dark-800 text-vl-cyan accent-vl-cyan focus:ring-0"
                  />
                  <span className="text-xs text-vl-dark-400 hover:text-vl-white-300">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-vl-cyan transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Primary Cyan Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="font-heading mt-2 h-11 w-full gap-2 rounded-lg bg-vl-cyan text-xs font-black tracking-widest text-vl-dark-900 uppercase transition-all hover:bg-vl-cyan-400 focus-visible:ring-2 focus-visible:ring-vl-cyan"
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
          )}

          {/* ── METHOD 2: PHONE OTP (Bangladeshi Mobile Flow) ── */}
          {authMethod === "phone" && (
            <div className="mt-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium text-vl-white-300">
                      Mobile Number
                    </Label>
                    <div className="relative flex rounded-lg border border-vl-dark-600 bg-vl-dark-800 focus-within:border-vl-cyan focus-within:ring-1 focus-within:ring-vl-cyan-400">
                      <div className="flex items-center gap-1.5 border-r border-vl-dark-600 bg-vl-dark-900 px-3 text-xs font-bold text-vl-white-300 select-none">
                        <span>🇧🇩</span>
                        <span>+880</span>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01712345678"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                        className="h-11 border-0 bg-transparent py-2.5 text-sm text-vl-white-300 shadow-none placeholder:text-vl-dark-500 focus-visible:ring-0"
                      />
                    </div>
                    <p className="text-[11px] text-vl-dark-400">
                      We&apos;ll send a 6-digit verification code to this number.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !phone}
                    className="font-heading h-11 w-full gap-2 rounded-lg bg-vl-cyan text-xs font-black tracking-widest text-vl-dark-900 uppercase transition-all hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>SENDING CODE...</span>
                      </>
                    ) : (
                      <>
                        <span>GET LOGIN CODE</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-vl-cyan-200 bg-vl-cyan-50 p-3 text-center">
                    <p className="text-xs text-vl-white-300">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-bold text-vl-cyan">{phone}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpDigits(["", "", "", "", "", ""]);
                        setDevOtp(null);
                        setError("");
                      }}
                      className="mt-1 text-xs font-medium text-vl-cyan underline-offset-4 hover:underline"
                    >
                      Change number
                    </button>
                  </div>

                  {/* Dev mode helper */}
                  {devOtp && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                      <span className="text-amber-300">
                        ⚡ Dev OTP: <strong className="font-mono text-white">{devOtp}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleAutoFillDevOtp}
                        className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-200 hover:bg-amber-500/30"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  {/* 6-digit OTP Inputs */}
                  <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-12 w-11 rounded-lg border border-vl-dark-600 bg-vl-dark-800 text-center font-mono text-xl font-black text-vl-white-300 transition-all focus:border-vl-cyan focus:ring-1 focus:ring-vl-cyan-400 focus:outline-none sm:w-12"
                      />
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={() => triggerVerifyOtp()}
                    disabled={isLoading || otpDigits.some((d) => !d)}
                    className="font-heading h-11 w-full gap-2 rounded-lg bg-vl-cyan text-xs font-black tracking-widest text-vl-dark-900 uppercase transition-all hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>VERIFYING...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4 text-vl-dark-900" />
                        <span>VERIFY & SIGN IN</span>
                      </>
                    )}
                  </Button>

                  {/* Resend Code / Countdown */}
                  <div className="text-center text-xs">
                    {countdown > 0 ? (
                      <span className="text-vl-dark-400">
                        Resend code in <strong className="text-vl-white-300">{countdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={isLoading}
                        className="font-bold text-vl-cyan underline-offset-4 hover:underline"
                      >
                        Resend OTP Code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Social Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-vl-dark-600" />
            </div>
            <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
              <span className="bg-vl-dark-900 px-3 font-semibold text-vl-dark-400">OR</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <form action={googleSignInAction} className="w-full">
            <SubmitButton
              variant="outline"
              className="h-11 w-full gap-2.5 rounded-lg border-vl-dark-600 bg-vl-dark-800 text-xs font-bold text-vl-white-300 transition-all hover:border-vl-dark-400/60 hover:bg-vl-dark-700 hover:text-white"
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
          <div className="mt-8 text-center text-xs text-vl-dark-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-vl-cyan underline-offset-4 transition-colors hover:underline"
            >
              Register
            </Link>
          </div>
        </main>

        {/* Bottom subtle copyright / tagline */}
        <footer className="text-center text-[11px] text-vl-dark-500 lg:text-left">
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
        <div className="flex min-h-screen items-center justify-center bg-vl-dark-900 text-vl-white-300">
          <RefreshCw className="size-6 animate-spin text-vl-cyan" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
