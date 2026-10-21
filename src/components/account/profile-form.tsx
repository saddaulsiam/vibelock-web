"use client";

import { resendVerificationAction } from "@/app/actions/verification";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/lib/account/actions";
import {
  Camera,
  Check,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ProfileFormProps {
  initialName: string;
  email: string;
  emailVerified: Date | null;
  initialImage: string | null;
  phone: string | null;
  createdAt: Date;
  authProvider: string;
}

const PRESET_AVATARS = [
  { label: "Tokyo Cyber", url: "/images/hero/hero-slide-1.png" },
  { label: "Urban Drift", url: "/images/hero/hero-slide-2.png" },
  { label: "Concrete Wave", url: "/images/hero/hero-slide-3.png" },
];

export function ProfileForm({
  initialName,
  email,
  emailVerified,
  initialImage,
  phone,
  createdAt,
  authProvider,
}: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImage ?? "");
  const [customUrlInput, setCustomUrlInput] = useState(initialImage ?? "");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setImageUrl(initialImage ?? "");
    setCustomUrlInput(initialImage ?? "");
  }, [initialImage]);

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [resendingEmail, setResendingEmail] = useState(false);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    const result = await updateProfileAction({
      name,
      image: imageUrl.trim() || null,
    });

    if (result.success) {
      setMessage("Profile details saved successfully.");
      toast.success("Profile updated successfully!");
      router.refresh();
    } else {
      setError(result.error ?? "Unable to update your profile.");
      toast.error(result.error ?? "Failed to save profile.");
    }
    setPending(false);
  }

  async function handleResendVerification() {
    setResendingEmail(true);
    try {
      const res = await resendVerificationAction({ email });
      if (res.success) {
        toast.success("Verification link sent! Please check your inbox.");
      } else {
        toast.error(res.error ?? "Could not send verification email.");
      }
    } catch {
      toast.error("Failed to send verification link. Try again later.");
    } finally {
      setResendingEmail(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {message && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800"
          role="status"
        >
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 1. Profile Avatar Section */}
      <div className="rounded-2xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#101114]/10 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#101114]/15 bg-white shadow-sm ring-4 ring-[#00D9FF]/20">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={name || "User Avatar"}
                  fill
                  sizes="80px"
                  unoptimized={Boolean(imageUrl.startsWith("http"))}
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#101114] text-xl font-black text-white">
                  {(name || email || "V").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#101114]">Profile Avatar</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#00D9FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#007b91]">
                  <Sparkles className="size-2.5" />
                  Streetwear Identity
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a signature VibeLock avatar preset or enter a custom image URL.
              </p>
            </div>
          </div>

          {imageUrl && (
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                setCustomUrlInput("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              Reset to Initials
            </button>
          )}
        </div>

        {/* Preset Selector */}
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#101114]">
            Select VibeLock Signature Preset:
          </p>
          <div className="flex flex-wrap gap-3">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = imageUrl === preset.url;
              return (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className={`group flex items-center gap-2 rounded-xl border p-2 pr-3.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-[#101114] bg-[#101114] text-white shadow-sm"
                      : "border-[#101114]/15 bg-white text-[#101114] hover:border-[#101114]/40"
                  }`}
                >
                  <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                    <Image
                      src={preset.url}
                      alt={preset.label}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <span>{preset.label}</span>
                  {isSelected && <Check className="size-3.5 text-[#00D9FF]" />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#101114]/30 bg-white/70 px-3 py-2 text-xs font-semibold text-[#101114] hover:bg-white transition-all"
            >
              <Camera className="size-3.5 text-[#0099b8]" />
              <span>{showCustomInput ? "Hide Custom URL" : "Custom Image URL"}</span>
            </button>
          </div>

          {/* Custom URL Input Accordion */}
          {showCustomInput && (
            <div className="mt-3 flex max-w-lg items-center gap-2 pt-2">
              <Input
                type="url"
                placeholder="https://example.com/your-avatar.jpg"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className="h-9 rounded-xl border-[#101114]/15 bg-white text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (customUrlInput.trim()) {
                    setImageUrl(customUrlInput.trim());
                    toast.success("Avatar preview updated!");
                  }
                }}
                className="h-9 rounded-xl bg-[#101114] px-3.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229]"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Personal Information Fields Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="profile-name" className="flex items-center gap-1.5 text-xs font-bold text-[#101114]">
            <User className="size-3.5 text-[#0099b8]" />
            <span>Full Name</span>
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={pending}
            placeholder="Your name"
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
          <p className="text-[11px] text-muted-foreground">
            Displayed on order invoices, packaging slips, and greetings.
          </p>
        </div>

        {/* Email Address with Verification Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-email" className="flex items-center gap-1.5 text-xs font-bold text-[#101114]">
              <Mail className="size-3.5 text-[#0099b8]" />
              <span>Email Address</span>
            </Label>
            {emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="size-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <ShieldAlert className="size-3" />
                Unverified
              </span>
            )}
          </div>
          <Input
            id="profile-email"
            value={email}
            disabled
            suppressHydrationWarning
            className="rounded-xl border-[#101114]/10 bg-[#F3F0E8]/50 text-xs text-muted-foreground cursor-not-allowed"
          />

          {!emailVerified && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 px-3">
              <span className="text-[11px] font-medium text-amber-800">
                Verify your email to receive order tracking links and exclusive drops.
              </span>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="shrink-0 rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-amber-800 disabled:opacity-50"
              >
                {resendingEmail ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Sending...
                  </span>
                ) : (
                  "Send Link"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Contact Phone Number */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="profile-phone" className="flex items-center gap-1.5 text-xs font-bold text-[#101114]">
            <Phone className="size-3.5 text-[#0099b8]" />
            <span>Delivery Contact Phone</span>
          </Label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Input
                id="profile-phone"
                value={phone || ""}
                readOnly
                placeholder="Not provided yet (+880 1XXXXXXXXX)"
                className="rounded-xl border-[#101114]/10 bg-[#F3F0E8]/40 text-xs text-[#101114]"
              />
            </div>
            <Link
              href="/account/addresses"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-4 py-2 text-xs font-bold text-[#101114] hover:bg-[#F3F0E8] transition-colors"
            >
              <span>Manage Addresses</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your delivery phone number is synced with your checkout addresses to ensure Steadfast and Pathao riders can contact you before drop deliveries.
          </p>
        </div>
      </div>



      {/* 4. Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-[#101114] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229] active:scale-95 disabled:opacity-50 shadow-sm"
        >
          {pending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving Details...</span>
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
