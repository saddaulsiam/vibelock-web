"use client";

import { useState, useRef } from "react";
import { MapPin, Plus, Check, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { NotificationPreferencesCard } from "./notification-preferences-card";
import { AccountSecurityCard } from "./account-security-card";
import { AddressList, type Address } from "../addresses/address-list";
import { AddressForm } from "../addresses/address-form";
import type { NotificationPreferences } from "@/lib/account/notification-types";

interface ProfileHubProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
    createdAt: Date;
    authProvider: string;
    latestPhone: string | null;
  };
  addresses: Address[];
  notificationPreferences: NotificationPreferences;
}

export function ProfileHub({ user, addresses, notificationPreferences }: ProfileHubProps) {
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const addressFormRef = useRef<HTMLDivElement>(null);

  const isGoogle = user.authProvider.toLowerCase().includes("google");

  const handleStartAdd = () => {
    setEditingAddress(null);
    setShowAddAddress((prev) => !prev);
  };

  const handleStartEdit = (address: Address) => {
    setShowAddAddress(false);
    setEditingAddress(address);
    setTimeout(() => {
      addressFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 40);
  };

  const handleCloseAddressForm = () => {
    setShowAddAddress(false);
    setEditingAddress(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Card 1: Personal Details ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white p-4 shadow-2xs sm:p-6 md:p-8">
        <div className="mb-5 border-b border-vl-dark-900/8 pb-4">
          <span className="text-[10px] font-semibold tracking-[0.15em] text-vl-cyan uppercase sm:text-[11px] sm:tracking-[0.2em]">
            Profile Settings
          </span>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-vl-dark-900 uppercase sm:text-lg">
            Personal Details
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Manage your personal identity, contact number, and profile image.
          </p>
        </div>

        <ProfileForm
          initialName={user.name ?? ""}
          email={user.email}
          emailVerified={user.emailVerified}
          initialImage={user.image}
          phone={user.latestPhone}
          createdAt={user.createdAt}
          authProvider={user.authProvider}
        />
      </div>

      {/* ── Card 2: How You Sign In ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white p-4 shadow-2xs sm:p-6 md:p-8">
        <div className="mb-4">
          <span className="text-[10px] font-semibold tracking-[0.15em] text-vl-cyan uppercase sm:text-[11px] sm:tracking-[0.2em]">
            Access & Security
          </span>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-vl-dark-900 uppercase sm:text-lg">
            How You Sign In
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Adding a second way is optional. It only ever adds to this account — nothing is
            replaced.
          </p>
        </div>

        <div className="flex flex-col gap-3.5 border-t border-vl-dark-900/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isGoogle ? (
              <span className="flex size-7 items-center justify-center rounded-full border border-vl-dark-900/10 bg-neutral-100 text-xs font-semibold text-neutral-800">
                G
              </span>
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full border border-vl-dark-900/10 bg-neutral-100 text-neutral-700">
                <Lock className="size-3.5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-vl-dark-900">
                  {isGoogle ? "Google Account" : "Email & Password"}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <Check className="size-3" /> Connected
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Primary authentication provider</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSecurityDetails(!showSecurityDetails)}
            className="w-full sm:w-auto"
          >
            <span>
              {showSecurityDetails
                ? "Hide Credentials"
                : isGoogle
                  ? "Security & Passwords"
                  : "Change Password"}
            </span>
            {showSecurityDetails ? (
              <ChevronUp className="size-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="size-3.5 text-neutral-400" />
            )}
          </Button>
        </div>

        {/* Collapsible Security & Password Manager */}
        {showSecurityDetails && (
          <div className="mt-6 border-t border-vl-dark-900/8 pt-6">
            <AccountSecurityCard />
          </div>
        )}
      </div>

      {/* ── Card 3: Delivery Addresses (with Instant Inline Edit & Add) ── */}
      <div
        id="addresses"
        className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white p-4 shadow-2xs sm:p-6 md:p-8"
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vl-dark-900/8 pb-5">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold tracking-[0.15em] text-vl-cyan uppercase sm:text-[11px] sm:tracking-[0.2em]">
              Shipping & Checkout
            </span>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 text-vl-dark-900" />
              <h2 className="mt-0.5 text-base font-bold tracking-tight text-vl-dark-900 uppercase sm:text-lg">
                Delivery Addresses
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Saved addresses fill in your checkout automatically. Entirely optional.
            </p>
          </div>

          <Button
            type="button"
            variant={showAddAddress ? "outline" : "brand"}
            size="sm"
            onClick={handleStartAdd}
          >
            <Plus className="size-3.5" />
            <span>{showAddAddress ? "Cancel" : "Add Address"}</span>
          </Button>
        </div>

        {/* Instant Add or Edit Address Form (Inline) */}
        {(showAddAddress || editingAddress) && (
          <div
            ref={addressFormRef}
            className="mt-5 rounded-xl border border-vl-dark-900/10 bg-vl-white-100 p-4 sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
                {editingAddress
                  ? `Edit Address — ${editingAddress.label || "Saved Address"}`
                  : "Add New Shipping Address"}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseAddressForm}
                className="text-neutral-500 hover:text-vl-dark-900"
              >
                Cancel
              </Button>
            </div>
            <AddressForm
              key={editingAddress?.id ?? "new"}
              address={
                editingAddress
                  ? {
                      id: editingAddress.id,
                      label: editingAddress.label || "",
                      street: editingAddress.street,
                      city: editingAddress.city,
                      state: editingAddress.state || "",
                      zip: editingAddress.zip || "",
                      country: editingAddress.country,
                      isDefault: editingAddress.isDefault,
                    }
                  : undefined
              }
              onDone={handleCloseAddressForm}
            />
          </div>
        )}

        {/* Address Content List / Empty State */}
        <div className="pt-5">
          {addresses.length === 0 && !showAddAddress && !editingAddress ? (
            <div className="py-10 text-center">
              <MapPin className="mx-auto size-6 text-neutral-300" />
              <p className="mt-2 text-xs font-normal text-vl-dark-900">No saved addresses yet</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                You can save a default delivery address here or type one in at checkout.
              </p>
            </div>
          ) : addresses.length > 0 ? (
            <AddressList
              addresses={addresses}
              onEdit={handleStartEdit}
              editingId={editingAddress?.id}
            />
          ) : null}
        </div>
      </div>

      {/* ── Card 4: Notification Preferences ── */}
      <div id="notifications">
        <NotificationPreferencesCard initialPreferences={notificationPreferences} />
      </div>
    </div>
  );
}
