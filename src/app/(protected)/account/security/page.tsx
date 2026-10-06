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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Account Security</h1>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure. This will sign you out of all devices.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePwSubmit}>
          <CardContent className="space-y-4">
            {pwError && <div className="text-sm text-destructive font-medium">{pwError}</div>}
            {pwSuccess && <div className="text-sm text-emerald-600 font-medium">{pwSuccess}</div>}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                required
                value={pwData.currentPassword}
                onChange={(e) =>
                  setPwData((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                disabled={pwLoading || !!pwSuccess}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={pwData.newPassword}
                onChange={(e) => setPwData((prev) => ({ ...prev, newPassword: e.target.value }))}
                disabled={pwLoading || !!pwSuccess}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                required
                value={pwData.confirmNewPassword}
                onChange={(e) =>
                  setPwData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
                }
                disabled={pwLoading || !!pwSuccess}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pwLoading || !!pwSuccess}>
              {pwLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage the devices that are currently logged in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionLoading ? (
            <div className="text-sm text-muted-foreground">Loading sessions...</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-muted/50 p-4 rounded-lg"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Session
                      {s.isCurrent && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(s.expires).toLocaleDateString()}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button variant="outline" size="sm" onClick={() => handleRevokeSession(s.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button variant="outline" onClick={handleRevokeOther}>
            Sign out all other devices
          </Button>
          <Button variant="destructive" onClick={handleRevokeAll}>
            Sign out all devices
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated personal data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!delConfirmMode ? (
            <Button variant="destructive" onClick={() => setDelConfirmMode(true)}>
              Delete Account
            </Button>
          ) : (
            <form
              onSubmit={handleDeleteAccount}
              className="space-y-4 bg-destructive/10 p-4 rounded-lg border border-destructive/20"
            >
              <div className="text-sm text-destructive font-medium mb-4">
                Are you sure? This action cannot be undone. Please enter your password to confirm.
              </div>

              {delError && <div className="text-sm text-destructive font-bold">{delError}</div>}

              <div className="space-y-2">
                <Label htmlFor="delPassword">Password</Label>
                <Input
                  id="delPassword"
                  type="password"
                  required
                  value={delPassword}
                  onChange={(e) => setDelPassword(e.target.value)}
                  disabled={delLoading}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="destructive" type="submit" disabled={delLoading}>
                  {delLoading ? "Deleting..." : "Confirm Deletion"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDelConfirmMode(false)}
                  disabled={delLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
