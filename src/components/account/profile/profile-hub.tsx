"use client";

import { useState, useRef } from "react";
import { MapPin, Plus, Check, Lock, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card variant="brand" className="p-4 sm:p-6 md:p-8">
        <div className="border-border/60 mb-5 border-b pb-4">
          <span className="text-vl-cyan sm:tracking-streetwear text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px]">
            Profile Settings
          </span>
          <h2 className="text-vl-dark-900 mt-0.5 text-base font-bold tracking-tight uppercase sm:text-lg">
            Personal Details
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
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
      </Card>

      {/* ── Card 2: How You Sign In ── */}
      <Card variant="brand" className="p-4 sm:p-6 md:p-8">
        <div className="mb-4">
          <span className="text-vl-cyan sm:tracking-streetwear text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px]">
            Access & Security
          </span>
          <h2 className="text-vl-dark-900 mt-0.5 text-base font-bold tracking-tight uppercase sm:text-lg">
            How You Sign In
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Adding a second way is optional. It only ever adds to this account — nothing is
            replaced.
          </p>
        </div>

        <div className="border-border/60 flex flex-col gap-3.5 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isGoogle ? (
              <span className="border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900 flex size-7 items-center justify-center rounded-full border text-xs font-semibold">
                G
              </span>
            ) : (
              <div className="border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-800 flex size-7 items-center justify-center rounded-full border">
                <Lock className="size-3.5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-vl-dark-900 text-xs font-semibold">
                  {isGoogle ? "Google Account" : "Email & Password"}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <Check className="size-3" /> Connected
                </span>
              </div>
              <p className="text-muted-foreground/80 text-[11px]">
                Primary authentication provider
              </p>
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
              <ChevronUp className="text-muted-foreground size-3.5" />
            ) : (
              <ChevronDown className="text-muted-foreground size-3.5" />
            )}
          </Button>
        </div>

        {/* Collapsible Security & Password Manager */}
        {showSecurityDetails && (
          <div className="border-border/60 mt-6 border-t pt-6">
            <AccountSecurityCard />
          </div>
        )}
      </Card>

      {/* ── Card 3: Delivery Addresses (with Instant Inline Edit & Add) ── */}
      <Card id="addresses" variant="brand" className="p-4 sm:p-6 md:p-8">
        {/* Card Header */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="min-w-0 flex-1">
            <span className="text-vl-cyan sm:tracking-streetwear text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px]">
              Shipping & Checkout
            </span>
            <div className="flex items-center gap-1.5">
              <MapPin className="text-vl-dark-900 size-4" />
              <h2 className="text-vl-dark-900 mt-0.5 text-base font-bold tracking-tight uppercase sm:text-lg">
                Delivery Addresses
              </h2>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Saved addresses fill in your checkout automatically. Entirely optional.
            </p>
          </div>

          <Button
            type="button"
            variant={showAddAddress ? "destructive" : "primary"}
            size="sm"
            onClick={handleStartAdd}
          >
            {showAddAddress ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            <span>{showAddAddress ? "Cancel" : "Add New"}</span>
          </Button>
        </div>

        {/* Instant Add or Edit Address Form (Inline) */}
        {(showAddAddress || editingAddress) && (
          <div
            ref={addressFormRef}
            className="border-vl-dark-900/10 bg-vl-white-100 mt-5 rounded-xl border p-4 sm:p-6"
          >
            <h3 className="text-vl-dark-900 mb-4 min-w-0 flex-1 truncate text-xs font-bold tracking-wider uppercase">
              {editingAddress
                ? `Edit Address — ${editingAddress.label || "Saved Address"}`
                : "Add New Shipping Address"}
            </h3>
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
              <MapPin className="text-muted-foreground/40 mx-auto size-6" />
              <p className="text-vl-dark-900 mt-2 text-xs font-normal">No saved addresses yet</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
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
      </Card>

      {/* ── Card 4: Notification Preferences ── */}
      <div id="notifications">
        <NotificationPreferencesCard initialPreferences={notificationPreferences} />
      </div>
    </div>
  );
}
