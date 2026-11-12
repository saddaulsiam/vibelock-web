"use client";

import { createAdminCustomerAction } from "@/lib/admin/customers/customer-actions";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customerId: string) => void;
}

export function CustomerCreateModal({ isOpen, onClose, onSuccess }: CustomerCreateModalProps) {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [city, setCity] = React.useState("Dhaka");
  const [state, setState] = React.useState("");
  const [zip, setZip] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Please enter customer's full name.");
      return;
    }

    if (!cleanPhone) {
      setError("Please provide a valid contact phone number.");
      return;
    }

    // Phone validation for BD format
    const digitsOnly = cleanPhone.replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 14) {
      setError("Please provide a valid 11-digit mobile number (e.g. 017XXXXXXXX).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createAdminCustomerAction({
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined,
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
      });

      if (!res.success || !res.customerId) {
        setError(res.error || "Failed to create customer profile.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("Customer profile created successfully!");
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(res.customerId);
      }

      // Smoothly navigate to new customer profile
      setTimeout(() => {
        onClose();
        router.push(`/admin/customers/${res.customerId}`);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-customer-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="mb-4 flex items-start justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h3 id="create-customer-title" className="text-sm font-bold text-neutral-900">
                Add New Customer
              </h3>
              <p className="text-xs text-neutral-500">
                Create manual customer profile for counter or phone orders
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="size-8 text-neutral-400 hover:text-neutral-700"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-900">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Personal Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
              Personal Information
            </h4>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  size="default"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    size="default"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Email Address{" "}
                  <span className="text-xs font-normal text-neutral-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="customer@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="default"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              * If email is omitted, an internal customer address will be automatically generated.
            </p>
          </div>

          {/* Delivery Address Details */}
          <div className="space-y-3 border-t border-neutral-100 pt-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-neutral-500" />
              <h4 className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                Primary Delivery Address
              </h4>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Street Address / Delivery Note
              </label>
              <Textarea
                rows={2}
                placeholder="House, Road, Area, Landmark (e.g. House 14, Road 5, Dhanmondi)"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">City</label>
                <Input
                  type="text"
                  placeholder="Dhaka"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  size="default"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Division / State
                </label>
                <Input
                  type="text"
                  placeholder="Dhaka"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  size="default"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Postal Code
                </label>
                <Input
                  type="text"
                  placeholder="1205"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  size="default"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="default" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating Profile...</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  <span>Create Customer</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
