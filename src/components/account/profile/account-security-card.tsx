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
import { Button } from "@/components/ui/button";
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
          <h2 className="text-sm font-bold tracking-tight text-[#101114] uppercase sm:text-base">
            Change Password
          </h2>
        </div>

        <form onSubmit={handlePwSubmit} className="max-w-md space-y-3.5 sm:space-y-4">
          {pwError && (
            <div
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-normal text-rose-800"
              role="alert"
            >
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-normal text-emerald-800"
              role="status"
            >
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-semibold text-[#101114]">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              variant="brand"
              size="md"
              type="password"
              required
              value={pwData.currentPassword}
              onChange={(e) => setPwData((prev) => ({ ...prev, currentPassword: e.target.value }))}
              disabled={pwLoading || !!pwSuccess}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-semibold text-[#101114]">
              New Password
            </Label>
            <Input
              id="newPassword"
              variant="brand"
              size="md"
              type="password"
              required
              value={pwData.newPassword}
              onChange={(e) => setPwData((prev) => ({ ...prev, newPassword: e.target.value }))}
              disabled={pwLoading || !!pwSuccess}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword" className="text-xs font-semibold text-[#101114]">
              Confirm New Password
            </Label>
            <Input
              id="confirmNewPassword"
              variant="brand"
              size="md"
              type="password"
              required
              value={pwData.confirmNewPassword}
              onChange={(e) =>
                setPwData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
              }
              disabled={pwLoading || !!pwSuccess}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={pwLoading}
              disabled={!!pwSuccess}
              className="w-full sm:w-auto"
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Active Sessions */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <div className="mb-3.5 flex items-center gap-2 border-b border-[#101114]/8 pb-3.5 sm:mb-4 sm:pb-4">
          <Laptop className="size-4 text-[#101114]" />
          <h2 className="text-sm font-bold tracking-tight text-[#101114] uppercase sm:text-base">
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
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#101114]">
                      <span>Device Session</span>
                      {s.isCurrent && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
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
                      className="min-h-9 rounded-md px-2.5 py-1 text-xs font-normal text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-vl-black/8 mt-4 flex flex-wrap gap-2.5 border-t pt-4">
              <Button onClick={handleRevokeOther} variant="outline" size="sm">
                Sign Out Other Devices
              </Button>
              <Button onClick={handleRevokeAll} variant="destructive" size="sm">
                Sign Out All Devices
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Delete Account */}
      <div className="rounded-xl border border-rose-200 bg-white p-4 sm:p-6">
        <div className="mb-3.5 flex items-center gap-2 border-b border-rose-100 pb-3.5 sm:mb-4 sm:pb-4">
          <AlertTriangle className="size-4 text-rose-600" />
          <h2 className="text-sm font-bold tracking-tight text-rose-700 uppercase sm:text-base">
            Delete Account
          </h2>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-neutral-600">
          Permanently delete your VibeLock account, order history, saved addresses, and profile
          details. This action cannot be undone.
        </p>

        {!delConfirmMode ? (
          <div className="pt-4">
            <Button onClick={() => setDelConfirmMode(true)} variant="danger" size="lg">
              Delete My Account
            </Button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="mt-4 max-w-md space-y-3">
            {delError && (
              <div
                className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-normal text-rose-800"
                role="alert"
              >
                {delError}
              </div>
            )}
            <Label htmlFor="delPassword" className="text-xs font-semibold text-rose-700">
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
              <Button type="submit" variant="danger" size="lg" loading={delLoading}>
                Permanently Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setDelConfirmMode(false);
                  setDelError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
