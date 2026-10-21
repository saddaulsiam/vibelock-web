"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/actions/account-security";
import {
  getActiveSessionsAction,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
  revokeAllSessionsAction,
  type SessionInfo,
} from "@/app/actions/session";
import { deleteAccountAction } from "@/app/actions/account-deletion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Laptop, AlertTriangle, Check } from "lucide-react";

export default function SecurityPage() {
  const router = useRouter();

  // Password Change State
  const [pwData, setPwData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Deletion State
  const [delPassword, setDelPassword] = useState("");
  const [delError, setDelError] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delConfirmMode, setDelConfirmMode] = useState(false);

  const loadSessions = async () => {
    setSessionLoading(true);
    const data = await getActiveSessionsAction();
    setSessions(data);
    setSessionLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, []);

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true);
    setPwError("");
    setPwSuccess("");

    const res = await changePasswordAction(pwData);

    if (res?.error) {
      setPwError(res.error);
      setPwLoading(false);
    } else if (res?.success) {
      setPwSuccess("Password changed successfully. You have been signed out of all devices.");
      setPwData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 3000);
    }
  };

  const handleRevokeSession = async (id: string) => {
    await revokeSessionAction(id);
    await loadSessions();
  };

  const handleRevokeOther = async () => {
    await revokeAllOtherSessionsAction();
    await loadSessions();
  };

  const handleRevokeAll = async () => {
    const res = await revokeAllSessionsAction();
    if (res.success) {
      router.push("/login");
      router.refresh();
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDelLoading(true);
    setDelError("");

    const res = await deleteAccountAction({ password: delPassword });
    if (res.error) {
      setDelError(res.error);
      setDelLoading(false);
    } else {
      router.push("/register");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
          Account Security
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Manage your password, login credentials, and active device sessions.
        </p>
      </div>

      {/* 2. Change Password Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
          <Lock className="size-4 text-[#101114]" />
          <span>Change Password</span>
        </h2>

        <form onSubmit={handlePwSubmit} className="max-w-lg space-y-4">
          {pwError && (
            <div
              className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border p-3 text-xs font-semibold"
              role="alert"
            >
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
              role="status"
            >
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-bold text-[#101114]">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              required
              value={pwData.currentPassword}
              onChange={(e) => setPwData((prev) => ({ ...prev, currentPassword: e.target.value }))}
              disabled={pwLoading || !!pwSuccess}
              className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-bold text-[#101114]">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              required
              value={pwData.newPassword}
              onChange={(e) => setPwData((prev) => ({ ...prev, newPassword: e.target.value }))}
              disabled={pwLoading || !!pwSuccess}
              className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword" className="text-xs font-bold text-[#101114]">
              Confirm New Password
            </Label>
            <Input
              id="confirmNewPassword"
              type="password"
              required
              value={pwData.confirmNewPassword}
              onChange={(e) =>
                setPwData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
              }
              disabled={pwLoading || !!pwSuccess}
              className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwLoading || !!pwSuccess}
              className="inline-flex items-center justify-center rounded-xl bg-[#101114] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229] active:scale-95 disabled:opacity-50"
            >
              {pwLoading ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Active Sessions Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
          <Laptop className="size-4 text-[#0099b8]" />
          <span>Active Device Sessions</span>
        </h2>

        {sessionLoading ? (
          <p className="text-muted-foreground py-4 text-xs">Loading active sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed border-[#101114]/15 bg-[#F3F0E8]/50 p-6 text-center text-xs">
            No other active sessions detected.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-3.5"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#101114]">
                    <span>Device Session</span>
                    {s.isCurrent && (
                      <span className="rounded-full bg-[#00D9FF]/20 px-2 py-0.5 text-[10px] font-bold text-[#007b91]">
                        Current Device
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Expires on {new Date(s.expires).toLocaleDateString()}
                  </p>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(s.id)}
                    className="rounded-lg border border-[#101114]/15 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#101114]/10 pt-2">
              <button
                type="button"
                onClick={handleRevokeOther}
                className="rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 text-xs font-bold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
              >
                Sign out other devices
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
              >
                Sign out all devices
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Danger Zone Card */}
      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-rose-100 pb-4 text-base font-bold text-rose-600">
          <AlertTriangle className="size-4" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-muted-foreground mb-4 text-xs">
          Permanently delete your VibeLock account and associated data. This action is irreversible.
        </p>

        {!delConfirmMode ? (
          <button
            type="button"
            onClick={() => setDelConfirmMode(true)}
            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
          >
            Delete Account
          </button>
        ) : (
          <form
            onSubmit={handleDeleteAccount}
            className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4"
          >
            <p className="text-xs font-semibold text-rose-700">
              Please enter your password to confirm permanent account deletion:
            </p>
            {delError && <div className="text-xs font-bold text-rose-700">{delError}</div>}
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="delPassword" className="text-xs font-bold text-[#101114]">
                Password
              </Label>
              <Input
                id="delPassword"
                type="password"
                required
                value={delPassword}
                onChange={(e) => setDelPassword(e.target.value)}
                disabled={delLoading}
                className="rounded-xl border-rose-300 bg-white text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={delLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {delLoading ? "Deleting..." : "Confirm Deletion"}
              </button>
              <button
                type="button"
                onClick={() => setDelConfirmMode(false)}
                disabled={delLoading}
                className="rounded-xl border border-[#101114]/15 bg-white px-4 py-2 text-xs font-bold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
