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

export function AccountSecurityCard() {
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
      setPwSuccess("Password changed successfully. You have been signed out of all other devices.");
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
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* 1. Change Password */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-[#101114]/8 pb-3.5 sm:mb-5 sm:pb-4">
          <Lock className="size-4 text-[#101114]" />
          <h2 className="text-sm font-black tracking-tight text-[#101114] uppercase sm:text-base">
            Change Password
          </h2>
        </div>

        <form onSubmit={handlePwSubmit} className="max-w-md space-y-3.5 sm:space-y-4">
          {pwError && (
            <div
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
              role="alert"
            >
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"
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
              className="min-h-[42px] rounded-lg border-[#101114]/15 bg-white text-xs"
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
              className="min-h-[42px] rounded-lg border-[#101114]/15 bg-white text-xs"
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
              className="min-h-[42px] rounded-lg border-[#101114]/15 bg-white text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwLoading || !!pwSuccess}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#101114] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 sm:w-auto"
            >
              {pwLoading ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Active Sessions */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <div className="mb-3.5 flex items-center gap-2 border-b border-[#101114]/8 pb-3.5 sm:mb-4 sm:pb-4">
          <Laptop className="size-4 text-[#101114]" />
          <h2 className="text-sm font-black tracking-tight text-[#101114] uppercase sm:text-base">
            Active Device Sessions
          </h2>
        </div>

        {sessionLoading ? (
          <p className="py-4 text-xs text-neutral-500">Loading active sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#101114]/10 p-6 text-center text-xs text-neutral-500">
            No other active sessions detected.
          </p>
        ) : (
          <div>
            <div className="divide-y divide-[#101114]/6">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-2"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#101114]">
                      <span>Device Session</span>
                      {s.isCurrent && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      Expires on {new Date(s.expires).toLocaleDateString()}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="min-h-[36px] rounded-md px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#101114]/8 pt-4">
              <button
                onClick={handleRevokeOther}
                className="min-h-[38px] rounded-lg border border-[#101114]/15 px-3 py-1.5 text-xs font-bold text-[#101114] transition-colors hover:bg-neutral-50"
              >
                Sign Out Other Devices
              </button>
              <button
                onClick={handleRevokeAll}
                className="min-h-[38px] rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
              >
                Sign Out All Devices
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Delete Account */}
      <div className="rounded-xl border border-rose-200 bg-white p-4 sm:p-6">
        <div className="mb-3.5 flex items-center gap-2 border-b border-rose-100 pb-3.5 sm:mb-4 sm:pb-4">
          <AlertTriangle className="size-4 text-rose-600" />
          <h2 className="text-sm font-black tracking-tight text-rose-700 uppercase sm:text-base">
            Delete Account
          </h2>
        </div>
        <p className="max-w-xl text-xs text-neutral-600 leading-relaxed">
          Permanently delete your VibeLock account, order history, saved addresses, and profile details.
          This action cannot be undone.
        </p>

        {!delConfirmMode ? (
          <div className="pt-4">
            <button
              onClick={() => setDelConfirmMode(true)}
              className="min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
            >
              Delete My Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="mt-4 max-w-md space-y-3">
            {delError && (
              <div
                className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800"
                role="alert"
              >
                {delError}
              </div>
            )}
            <Label htmlFor="delPassword" className="text-xs font-bold text-rose-700">
              Confirm your password to permanently delete:
            </Label>
            <Input
              id="delPassword"
              type="password"
              required
              value={delPassword}
              onChange={(e) => setDelPassword(e.target.value)}
              disabled={delLoading}
              className="min-h-[42px] rounded-lg border-rose-300 text-xs"
            />
            <div className="flex gap-2.5 pt-1">
              <button
                type="submit"
                disabled={delLoading}
                className="min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {delLoading ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDelConfirmMode(false);
                  setDelError("");
                }}
                className="min-h-[40px] rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
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
