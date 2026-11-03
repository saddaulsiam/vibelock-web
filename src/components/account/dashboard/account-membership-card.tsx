import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  ExternalLink,
  Laptop,
  CheckCircle2,
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
    <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 pb-4 sm:mb-6 sm:pb-5">
        <div>
          <h2 className="text-sm font-black tracking-tight text-[#101114] uppercase sm:text-base">
            Membership & Security
          </h2>
          <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
            Account identity, authentication providers, and protection status
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
          Member ID: {userId.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="space-y-6">
        {/* 1. Membership Info Grid - Clean borderless */}
        <div className="grid grid-cols-1 gap-4 border-b border-[#101114]/8 pb-6 sm:grid-cols-3">
          {/* Member Since */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Member Since
            </p>
            <p className="mt-1 text-sm font-black text-[#101114]">{formattedDate}</p>
            <p className="mt-0.5 text-xs text-neutral-500">VibeLock Customer</p>
          </div>

          {/* Account Status */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Status
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-sm font-black text-[#101114]">Active</span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">Standard Access</p>
          </div>

          {/* Email Verification */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Email Security
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {emailVerified ? (
                <>
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="text-sm font-black text-emerald-700">Verified</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-amber-600" />
                  <span className="text-sm font-black text-amber-700">Unverified</span>
                </>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-neutral-500" title={email}>
              {email}
            </p>
          </div>
        </div>

        {/* 2. Connected Providers - Clean list */}
        <div>
          <h3 className="mb-3 text-xs font-bold tracking-wider text-neutral-500 uppercase">
            Authentication Providers
          </h3>

          <div className="divide-y divide-[#101114]/6">
            {/* Google OAuth Row */}
            <div className="flex flex-col items-start justify-between gap-3 py-3.5 sm:flex-row sm:items-center first:pt-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#101114]/10 bg-neutral-50 text-xs font-bold">
                  <span className="text-[#4285F4]">G</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#101114]">Google Account</span>
                    {isGoogle ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Primary
                      </span>
                    ) : (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {isGoogle ? `Connected as ${email}` : "Google SSO"}
                  </p>
                </div>
              </div>

              {isGoogle && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  <span>Linked</span>
                </span>
              )}
            </div>

            {/* Email & Password Row */}
            <div className="flex flex-col items-start justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#101114]/10 bg-[#101114] text-white">
                  <Key className="size-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#101114]">Email & Password</span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                      Encrypted
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Standard credential authentication
                  </p>
                </div>
              </div>

              <Link
                href="/account/security"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#101114]"
              >
                <span>Change password</span>
                <ExternalLink className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Session & Security Shortcut */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-[#101114]/8 pt-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Laptop className="size-4 shrink-0 text-neutral-400" />
            <div>
              <p className="text-xs font-bold text-[#101114]">Active Sessions</p>
              <p className="text-[11px] text-neutral-500">
                Review devices currently logged into your account
              </p>
            </div>
          </div>

          <Link
            href="/account/security"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#101114]"
          >
            <span>Manage sessions</span>
            <ExternalLink className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
