"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, uploadAvatarAction } from "@/lib/account/actions";
import {
  Check,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { resendVerificationAction } from "@/app/actions/verification";

interface ProfileFormProps {
  initialName: string;
  email: string;
  emailVerified: Date | null;
  initialImage: string | null;
  phone: string | null;
  createdAt?: Date;
  authProvider?: string;
}

export function ProfileForm({
  initialName,
  email,
  emailVerified,
  initialImage,
  phone: initialPhone,
}: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone || "");
  const [imageUrl, setImageUrl] = useState(initialImage || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Prefer not to say");

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  // Handle direct file upload from user's device
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadAvatarAction(formData);
      if (res.success && res.url) {
        setImageUrl(res.url);
        toast.success("Profile photo uploaded! Click 'Save Changes' to apply.");
      } else {
        toast.error(res.error || "Failed to upload photo. Please try again.");
        setImageUrl(initialImage || "");
      }
    } catch {
      toast.error("Upload error. Please try again.");
      setImageUrl(initialImage || "");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    const result = await updateProfileAction({
      name,
      phone: phone.trim() || null,
      image: imageUrl.trim() || null,
    });

    if (result.success) {
      setMessage("Profile details saved successfully.");
      toast.success("Profile details updated successfully!");
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
    <form onSubmit={submit} className="space-y-6">
      {message && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-semibold text-emerald-800"
          role="status"
        >
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-semibold text-rose-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload profile photo file"
      />

      {/* ── 1. Modern Studio Avatar Uploader ── */}
      <div className="flex flex-col gap-4 border-b border-[#101114]/8 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-[#101114]/15 bg-neutral-100 shadow-2xs sm:size-18">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name || "User Avatar"}
                fill
                sizes="72px"
                unoptimized={Boolean(
                  imageUrl.startsWith("http") ||
                    imageUrl.startsWith("blob:") ||
                    imageUrl.startsWith("data:")
                )}
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#101114] text-xl font-black text-white">
                {(name || email || "V").slice(0, 1).toUpperCase()}
              </div>
            )}

            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white backdrop-blur-2xs">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>

          <div>
            <span className="text-xs font-bold tracking-wider text-[#101114] uppercase">
              Profile Photo
            </span>
            <p className="mt-0.5 text-xs text-neutral-500">
              Upload a high-resolution JPG, PNG or WebP image (Max 5MB).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-4 py-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-neutral-50 active:scale-95 disabled:opacity-50"
          >
            {uploadingAvatar ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-neutral-500" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="size-3.5 text-neutral-500" />
                <span>{imageUrl ? "Change Photo" : "Upload Photo"}</span>
              </>
            )}
          </button>

          {imageUrl && !uploadingAvatar && (
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                toast.info("Photo removed. Click 'Save Changes' to confirm.");
              }}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              title="Remove photo"
            >
              <Trash2 className="size-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Full Name ── */}
      <div className="space-y-1.5">
        <Label
          htmlFor="profile-name"
          className="text-[11px] font-bold tracking-wider text-[#101114] uppercase"
        >
          Full Name
        </Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={pending}
          placeholder="Your full name"
          className="min-h-11 rounded-xl border-[#101114]/15 bg-white text-xs text-[#101114] placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#101114]"
        />
      </div>

      {/* ── 3. Phone Number (Editable) ── */}
      <div className="space-y-1.5">
        <Label
          htmlFor="profile-phone"
          className="text-[11px] font-bold tracking-wider text-[#101114] uppercase"
        >
          Phone Number
        </Label>
        <Input
          id="profile-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={pending}
          placeholder="No phone number on this account"
          className="min-h-11 rounded-xl border-[#101114]/15 bg-white text-xs text-[#101114] placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-[#101114]"
        />
        <p className="text-[11px] text-neutral-500">
          Used for delivery courier calls and instant order dispatch SMS updates.
        </p>
      </div>

      {/* ── 4. Email ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="profile-email"
            className="text-[11px] font-bold tracking-wider text-[#101114] uppercase"
          >
            Email
          </Label>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck className="size-3" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <ShieldAlert className="size-3" />
              Unverified
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            id="profile-email"
            value={email}
            disabled
            className="min-h-11 cursor-not-allowed rounded-xl border-[#101114]/10 bg-neutral-50 pr-8 text-xs text-neutral-600"
          />
          {emailVerified && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-600">
              <Check className="size-3.5" />
            </div>
          )}
        </div>

        {!emailVerified && (
          <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:flex-row sm:items-center">
            <span className="text-[11px] text-amber-800">
              Verify your email to receive real-time order tracking and invoice receipts.
            </span>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="min-h-7 shrink-0 rounded-lg bg-amber-700 px-3 py-1 text-[11px] font-bold text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
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

      {/* ── 5. Date of Birth & Gender ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-dob"
            className="text-[11px] font-bold tracking-wider text-[#101114] uppercase"
          >
            Date of Birth
          </Label>
          <Input
            id="profile-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={pending}
            className="min-h-11 rounded-xl border-[#101114]/15 bg-white text-xs text-[#101114] focus-visible:ring-1 focus-visible:ring-[#101114]"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="profile-gender"
            className="text-[11px] font-bold tracking-wider text-[#101114] uppercase"
          >
            Gender
          </Label>
          <select
            id="profile-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            disabled={pending}
            className="flex min-h-11 w-full rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 text-xs text-[#101114] transition-colors focus:border-[#101114] focus:outline-none"
          >
            <option value="Prefer not to say">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* ── 6. Save Changes Button ── */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={pending || uploadingAvatar}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101114] px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800 active:scale-95 disabled:opacity-50"
        >
          {pending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving Changes...</span>
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
}
