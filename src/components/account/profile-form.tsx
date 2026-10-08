"use client";

import { useState } from "react";
import { updateProfileAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    const result = await updateProfileAction({ name });
    if (result.success) setMessage("Profile updated.");
    else setError(result.error ?? "Unable to update your profile.");
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? <p className="text-sm font-medium text-emerald-700" role="status">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required disabled={pending} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}
