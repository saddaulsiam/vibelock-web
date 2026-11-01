import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface AccountMembershipCardProps {
  email: string;
  emailVerified: Date | null;
  createdAt: Date;
  authProvider: string;
  userId: string;
}

export function AccountMembershipCard({
  email,
  emailVerified,
  createdAt,
  authProvider,
  userId,
}: AccountMembershipCardProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt));

  const isGoogle = authProvider === "google";

  return (
    <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101114] text-white">
            <Key className="size-5 text-[#00D9FF]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#101114] uppercase sm:text-xl">
              Account Membership & Login Security
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Review your VibeLock streetwear membership status, login providers, and security
              controls.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D9FF]/15 px-3 py-1 text-xs font-bold text-[#007b91]">
          <Sparkles className="size-3" />
          Streetwear Member
        </span>
      </div>

      <div className="space-y-6">
        {/* 1. Membership Tier & Identity Grid */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {/* Member Since */}
          <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-4">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Member Since
            </p>
            <p className="mt-1 text-sm font-black text-[#101114]">{formattedDate}</p>
            <p className="text-muted-foreground mt-1 text-[11px]">Lifetime VibeLock Customer</p>
          </div>

          {/* Account Status */}
          <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-4">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Account Status
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-sm font-black text-[#101114]">Active & Verified</span>
            </div>
            <p className="text-muted-foreground mt-1 truncate text-[11px]" title={userId}>
              ID: {userId.slice(0, 13).toUpperCase()}...
            </p>
          </div>

          {/* Email Verification */}
          <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-4">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Email Security
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {emailVerified ? (
                <>
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="text-sm font-black text-emerald-700">Verified Email</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-amber-600" />
                  <span className="text-sm font-black text-amber-700">Unverified</span>
                </>
              )}
            </div>
            <p className="text-muted-foreground mt-1 truncate text-[11px]" title={email}>
              {email}
            </p>
          </div>
        </div>

        {/* 2. Connected Providers */}
        <div className="rounded-xl border border-[#101114]/10 p-4 sm:p-5">
          <h3 className="mb-4 border-b border-[#101114]/10 pb-3 text-xs font-bold tracking-wider text-[#101114] uppercase">
            Connected Authentication Providers
          </h3>

          <div className="space-y-3">
            {/* Google OAuth Row */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#101114]/10 bg-white p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#101114]/10 bg-white text-xs font-bold shadow-xs">
                  <span className="text-[#4285F4]">G</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#101114]">Google Account</span>
                    {isGoogle ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Primary Login
                      </span>
                    ) : (
                      <span className="text-muted-foreground rounded-full bg-[#101114]/5 px-2 py-0.5 text-[10px] font-semibold">
                        Not linked
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {isGoogle
                      ? `Connected to ${email}`
                      : "Quick one-click authentication with Google"}
                  </p>
                </div>
              </div>

              {isGoogle && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  <span>Connected</span>
                </span>
              )}
            </div>

            {/* Email & Password Row */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#101114]/10 bg-white p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#101114]/10 bg-[#101114] text-white shadow-xs">
                  <Key className="size-4 text-[#00D9FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#101114]">Email & Password</span>
                    <span className="rounded-full bg-[#101114]/5 px-2 py-0.5 text-[10px] font-bold text-[#101114]">
                      Encrypted
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Protected with industry-standard bcrypt encryption
                  </p>
                </div>
              </div>

              <Link
                href="/account/security"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
              >
                <span>Change Password</span>
                <ExternalLink className="text-muted-foreground size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Session & Security Shortcut */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#101114]/10 bg-white text-[#0099b8]">
              <Laptop className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#101114]">Active Sessions & Devices</p>
              <p className="text-muted-foreground text-[11px]">
                You can review signed-in devices, revoke active sessions, or sign out all devices.
              </p>
            </div>
          </div>

          <Link
            href="/account/security"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0099b8] transition-colors hover:text-[#00c2e5]"
          >
            <span>Manage All Sessions</span>
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
