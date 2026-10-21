import { verifyEmailAction } from "@/app/actions/verification";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface VerifyEmailPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const token =
    typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token : undefined;

  if (!token) {
    redirect("/login");
  }

  const result = await verifyEmailAction({ token });

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Card */}
      <div className="border-border/50 bg-card relative overflow-hidden rounded-2xl border shadow-2xl">
        {/* Top accent gradient */}
        <div
          className={`absolute inset-x-0 top-0 h-1 ${
            result.success
              ? "bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500"
              : "bg-gradient-to-r from-red-500 via-rose-400 to-pink-500"
          }`}
        />

        {/* Background glow */}
        <div
          className={`pointer-events-none absolute inset-0 opacity-[0.04] ${
            result.success
              ? "[background:radial-gradient(ellipse_at_top,_theme(colors.emerald.500),_transparent_70%)]"
              : "[background:radial-gradient(ellipse_at_top,_theme(colors.red.500),_transparent_70%)]"
          }`}
        />

        <div className="relative px-8 pt-10 pb-8">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-full ${
                result.success
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "bg-red-500/10 ring-1 ring-red-500/30"
              }`}
            >
              <div
                className={`absolute inset-0 animate-ping rounded-full opacity-20 ${
                  result.success ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ animationDuration: "2s" }}
              />
              {result.success ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-foreground mb-2 text-center text-2xl font-bold tracking-tight">
            {result.success ? "Email Verified!" : "Verification Failed"}
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-8 text-center text-sm leading-relaxed">
            {result.success
              ? "Your email address has been successfully verified. You now have full access to your VibeLock account."
              : result.error ||
                "There was a problem verifying your email. The link may have expired or already been used."}
          </p>

          {/* Divider */}
          <div className="border-border/50 mb-6 border-t" />

          {/* CTAs */}
          {result.success ? (
            <div className="space-y-3">
              <Link
                href="/"
                id="verify-continue-shopping"
                className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:gap-3 hover:opacity-90"
              >
                Continue Shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                id="verify-go-login"
                className="border-border text-foreground hover:bg-muted/50 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors duration-200"
              >
                <Mail className="h-4 w-4" />
                Go to Login
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href="/account/profile"
                id="verify-resend-link"
                className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" />
                Resend Verification Email
              </Link>
              <Link
                href="/"
                id="verify-return-home"
                className="border-border text-foreground hover:bg-muted/50 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors duration-200"
              >
                Return Home
              </Link>
            </div>
          )}

          {/* Footer */}
          <p className="text-muted-foreground/60 mt-6 text-center text-xs">
            {result.success
              ? "Welcome to VibeLock — the streetwear community."
              : "If you continue to have issues, please contact support."}
          </p>
        </div>
      </div>
    </div>
  );
}
