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
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
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
          className={`absolute inset-0 opacity-[0.04] pointer-events-none ${
            result.success
              ? "[background:radial-gradient(ellipse_at_top,_theme(colors.emerald.500),_transparent_70%)]"
              : "[background:radial-gradient(ellipse_at_top,_theme(colors.red.500),_transparent_70%)]"
          }`}
        />

        <div className="relative px-8 pt-10 pb-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className={`relative flex items-center justify-center w-20 h-20 rounded-full ${
                result.success
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "bg-red-500/10 ring-1 ring-red-500/30"
              }`}
            >
              <div
                className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                  result.success ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{ animationDuration: "2s" }}
              />
              {result.success ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-10 h-10 text-red-500" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-2xl font-bold tracking-tight text-foreground mb-2">
            {result.success ? "Email Verified!" : "Verification Failed"}
          </h1>

          {/* Description */}
          <p className="text-center text-sm text-muted-foreground mb-8 leading-relaxed">
            {result.success
              ? "Your email address has been successfully verified. You now have full access to your VibeLock account."
              : result.error ||
                "There was a problem verifying your email. The link may have expired or already been used."}
          </p>

          {/* Divider */}
          <div className="border-t border-border/50 mb-6" />

          {/* CTAs */}
          {result.success ? (
            <div className="space-y-3">
              <Link
                href="/"
                id="verify-continue-shopping"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all duration-200 hover:gap-3"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                id="verify-go-login"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors duration-200"
              >
                <Mail className="w-4 h-4" />
                Go to Login
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href="/account/profile"
                id="verify-resend-link"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Resend Verification Email
              </Link>
              <Link
                href="/"
                id="verify-return-home"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors duration-200"
              >
                Return Home
              </Link>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            {result.success
              ? "Welcome to VibeLock — the streetwear community."
              : "If you continue to have issues, please contact support."}
          </p>
        </div>
      </div>
    </div>
  );
}

