"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  registerAction,
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
  googleSignInAction,
} from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  Check,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Auth method: "email" (standard password flow) or "phone" (instant OTP registration)
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  // Email form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP state
  const [phoneName, setPhoneName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // OTP Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus OTP box on send
  useEffect(() => {
    if (otpSent && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [otpSent]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  // Inline Password Validation
  const hasMinLength = formData.password.length >= 8;

  // Handle Standard Email/Password Register
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!hasMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await registerAction({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.password,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        setIsSuccess(true);
        setIsLoading(false);
      }
    } catch {
      setError("An unexpected error occurred during registration. Please try again.");
      setIsLoading(false);
    }
  };

  // Handle Send Phone OTP for quick join
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneName.trim() || phoneName.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
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
      triggerVerifyPhoneOtp(newDigits.join(""));
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
      setOtpDigits(paste.split(""));
      otpInputRefs.current[5]?.focus();
      triggerVerifyPhoneOtp(paste);
    }
  };

  const handleAutoFillDevOtp = () => {
    if (!devOtp || devOtp.length !== 6) return;
    setOtpDigits(devOtp.split(""));
    triggerVerifyPhoneOtp(devOtp);
  };

  const triggerVerifyPhoneOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError("");

    const res = await verifyPhoneOtpAction({
      phone,
      otp: code,
      name: phoneName.trim(),
    });

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
          Front-view model wearing black oversized VibeLock T-shirt,
          sunglasses, and silver accessories.
      ══════════════════════════════════════════════════════ */}
      <div className="bg-vl-dark-900 relative hidden h-full w-full overflow-hidden lg:block">
        <Image
          src="/images/auth/login-front-model.png"
          alt="VibeLock Register Page Image"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Subtle dark gradient overlay to blend into the right panel */}
        <div className="to-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent" />
        <div className="from-vl-dark-900 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-black/30" />

        {/* Editorial Fashion Badge */}
        <div className="absolute bottom-10 left-10 z-10 max-w-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur-md">
            <span className="bg-vl-cyan size-1.5 rounded-full" />
            <span className="font-heading tracking-streetwear text-vl-white-300 text-[10px] font-bold uppercase">
              NEW MEMBER ACCESS // VIBELOCK
            </span>
          </div>
          <p className="font-heading text-vl-white-300 mt-3 text-2xl font-black tracking-tight uppercase">
            JOIN THE MOVEMENT
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE COMPACT HERO BANNER (< lg screens)
      ══════════════════════════════════════════════════════ */}
      <div className="bg-vl-dark-900 relative h-44 w-full overflow-hidden sm:h-56 lg:hidden">
        <Image
          src="/images/auth/login-front-model.png"
          alt="VibeLock Register Page Image"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
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
      <div className="flex min-h-[calc(100vh-11rem)] w-full flex-col justify-between p-5 sm:p-8 lg:min-h-screen lg:p-8 xl:p-12">
        {/* Desktop Top Header Bar */}
        <header className="hidden items-center justify-between lg:flex">
          <Link
            href="/"
            className="group text-vl-dark-400 hover:text-vl-white-300 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
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

        {/* Main Center Form Container */}
        <main className="mx-auto my-auto w-full max-w-md py-2 sm:py-4">
          {/* SUCCESS STATE */}
          {isSuccess ? (
            <div className="space-y-6 text-center">
              <div className="border-vl-cyan-200 bg-vl-cyan-50 text-vl-cyan mx-auto flex size-14 items-center justify-center rounded-full border">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-vl-white-300 text-3xl font-black tracking-tight uppercase">
                  Check Your Inbox
                </h2>
                <p className="text-vl-dark-400 text-sm leading-relaxed">
                  We sent a confirmation link to{" "}
                  <strong className="text-vl-white-300">{formData.email}</strong>. Please click the
                  link in your email to verify your account and activate your exclusive member
                  drops.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 h-11 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase">
                    <span>Proceed to Log In</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Tagline & Headings */}
              <div className="space-y-1 text-left">
                <span className="font-heading text-vl-cyan inline-block text-[10px] font-bold tracking-[0.25em] uppercase">
                  STREETWEAR FOR DHAKA YOUTH
                </span>
                <h1 className="font-heading text-vl-white-300 text-2xl font-black tracking-tight sm:text-3xl">
                  Create Your Account
                </h1>
                <p className="text-vl-dark-400 text-xs font-normal">
                  Join VibeLock and be part of the movement
                </p>
              </div>

              {/* Method Switcher */}
              <div className="border-vl-dark-600/60 bg-vl-dark-800 mt-4 flex rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("email");
                    setError("");
                  }}
                  className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold tracking-wider uppercase transition-all ${
                    authMethod === "email"
                      ? "bg-vl-dark-900 text-vl-white-300 ring-vl-cyan-300 shadow-sm ring-1"
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
                  className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold tracking-wider uppercase transition-all ${
                    authMethod === "phone"
                      ? "bg-vl-dark-900 text-vl-white-300 ring-vl-cyan-300 shadow-sm ring-1"
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
                  className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs font-medium text-red-400"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* ── METHOD 1: EMAIL SIGNUP (Mockup Specification) ── */}
              {authMethod === "email" && (
                <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-vl-white-300 text-xs font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="text-vl-dark-400 pointer-events-none absolute top-3 left-3.5 size-4" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isLoading}
                        autoComplete="name"
                        className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-10 rounded-lg pl-10 text-sm focus-visible:ring-1"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-vl-white-300 text-xs font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="text-vl-dark-400 pointer-events-none absolute top-3 left-3.5 size-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isLoading}
                        autoComplete="email"
                        className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-10 rounded-lg pl-10 text-sm focus-visible:ring-1"
                      />
                    </div>
                  </div>

                  {/* Phone Number (Optional) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="phone" className="text-vl-white-300 text-xs font-medium">
                        Phone Number
                      </Label>
                      <span className="text-vl-dark-400 text-[10px]">Optional</span>
                    </div>
                    <div className="relative">
                      <Phone className="text-vl-dark-400 pointer-events-none absolute top-3 left-3.5 size-4" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isLoading}
                        autoComplete="tel"
                        className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-10 rounded-lg pl-10 text-sm focus-visible:ring-1"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-vl-white-300 text-xs font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="text-vl-dark-400 pointer-events-none absolute top-3 left-3.5 size-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-10 rounded-lg pr-10 pl-10 text-sm focus-visible:ring-1"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="text-vl-dark-400 hover:text-vl-white-300 absolute top-3 right-3 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Inline Password Requirement Check */}
                    <div className="flex items-center gap-1.5 pt-0.5 text-[11px]">
                      <span
                        className={`flex size-3.5 items-center justify-center rounded-full ${
                          hasMinLength
                            ? "bg-vl-cyan text-vl-dark-900"
                            : "bg-vl-dark-600 text-vl-dark-400"
                        }`}
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                      <span className={hasMinLength ? "text-vl-white-300" : "text-vl-dark-400"}>
                        Minimum 8 characters
                      </span>
                    </div>
                  </div>

                  {/* Terms & Privacy statement */}
                  <p className="text-vl-dark-400 text-[10px] leading-relaxed">
                    By creating an account, you agree to VibeLock&apos;s{" "}
                    <Link href="/terms" className="text-vl-cyan underline-offset-2 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-vl-cyan underline-offset-2 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>

                  {/* Primary Cyan Create Account Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan mt-1 h-10.5 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all focus-visible:ring-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>CREATING ACCOUNT...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* ── METHOD 2: PHONE OTP SIGNUP ── */}
              {authMethod === "phone" && (
                <div className="mt-6">
                  {!otpSent ? (
                    <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="phoneName"
                          className="text-vl-white-300 text-xs font-medium"
                        >
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="text-vl-dark-400 pointer-events-none absolute top-3.5 left-3.5 size-4" />
                          <Input
                            id="phoneName"
                            type="text"
                            placeholder="Enter your full name"
                            required
                            value={phoneName}
                            onChange={(e) => setPhoneName(e.target.value)}
                            disabled={isLoading}
                            className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 placeholder:text-vl-dark-500 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 h-11 rounded-lg pl-10 text-sm focus-visible:ring-1"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-vl-white-300 text-xs font-medium">
                          Mobile Number
                        </Label>
                        <div className="border-vl-dark-600 bg-vl-dark-800 focus-within:border-vl-cyan focus-within:ring-vl-cyan-400 relative flex rounded-lg border focus-within:ring-1">
                          <div className="border-vl-dark-600 bg-vl-dark-900 text-vl-white-300 flex items-center gap-1.5 border-r px-3 text-xs font-bold select-none">
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
                            className="text-vl-white-300 placeholder:text-vl-dark-500 h-11 border-0 bg-transparent py-2.5 text-sm shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <p className="text-vl-dark-400 text-[11px]">
                          We will verify this number with a one-time 6-digit passcode.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || !phone || !phoneName}
                        className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan h-11 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin" />
                            <span>SENDING CODE...</span>
                          </>
                        ) : (
                          <>
                            <span>GET JOIN CODE</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="border-vl-cyan-200 bg-vl-cyan-50 rounded-lg border p-3 text-center">
                        <p className="text-vl-white-300 text-xs">
                          Enter the 6-digit code sent to{" "}
                          <span className="text-vl-cyan font-bold">{phone}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpDigits(["", "", "", "", "", ""]);
                            setDevOtp(null);
                            setError("");
                          }}
                          className="text-vl-cyan mt-1 text-xs font-medium underline-offset-4 hover:underline"
                        >
                          Change number
                        </button>
                      </div>

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

                      <div
                        className="flex justify-between gap-1.5 sm:gap-2"
                        onPaste={handleOtpPaste}
                      >
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
                            className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 focus:border-vl-cyan focus:ring-vl-cyan-400 h-12 w-11 rounded-lg border text-center font-mono text-xl font-black transition-all focus:ring-1 focus:outline-none sm:w-12"
                          />
                        ))}
                      </div>

                      <Button
                        type="button"
                        onClick={() => triggerVerifyPhoneOtp()}
                        disabled={isLoading || otpDigits.some((d) => !d)}
                        className="font-heading bg-vl-cyan text-vl-dark-900 hover:bg-vl-cyan-400 focus-visible:ring-vl-cyan h-11 w-full gap-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin" />
                            <span>VERIFYING & JOINING...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="text-vl-dark-900 size-4" />
                            <span>COMPLETE REGISTRATION</span>
                          </>
                        )}
                      </Button>

                      <div className="text-center text-xs">
                        {countdown > 0 ? (
                          <span className="text-vl-dark-400">
                            Resend code in{" "}
                            <strong className="text-vl-white-300">{countdown}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendPhoneOtp()}
                            disabled={isLoading}
                            className="text-vl-cyan font-bold underline-offset-4 hover:underline"
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
              <div className="relative my-3 sm:my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="border-vl-dark-600 w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
                  <span className="bg-vl-dark-900 text-vl-dark-400 px-3 font-semibold">OR</span>
                </div>
              </div>

              {/* Google Sign-Up Button */}
              <form action={googleSignInAction} className="w-full">
                <SubmitButton
                  variant="outline"
                  className="border-vl-dark-600 bg-vl-dark-800 text-vl-white-300 hover:border-vl-dark-400/60 hover:bg-vl-dark-700 h-10 w-full gap-2.5 rounded-lg text-xs font-bold transition-all hover:text-white"
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

              {/* Login Link Footer */}
              <div className="text-vl-dark-400 mt-4 text-center text-xs sm:mt-5">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-vl-cyan font-bold underline-offset-4 transition-colors hover:underline"
                >
                  Log in
                </Link>
              </div>
            </>
          )}
        </main>

        {/* Bottom subtle copyright / tagline */}
        <footer className="text-vl-dark-500 text-center text-[11px] lg:text-left">
          © {new Date().getFullYear()} VibeLock. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-vl-dark-900 text-vl-white-300 flex min-h-screen items-center justify-center">
          <RefreshCw className="text-vl-cyan size-6 animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
