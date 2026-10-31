"use client";

import * as React from "react";
import { Edit3, Phone, Mail } from "lucide-react";
import { CustomerEditModal } from "@/components/admin/customers/customer-edit-modal";
import { CustomerSmartCrmActions } from "@/components/admin/customers/customer-smart-crm-actions";

interface CustomerDetailHeaderActionsProps {
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    addresses?: Array<{
      id: string;
      label: string | null;
      street: string;
      city: string;
      state: string | null;
      zip: string | null;
      country: string;
      isDefault: boolean;
    }>;
  };
  preferredSize?: string | null;
  totalOrders: number;
  totalSpent: number;
}

export function CustomerDetailHeaderActions({
  customer,
  preferredSize,
  totalOrders,
  totalSpent,
}: CustomerDetailHeaderActionsProps) {
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Edit Profile Button */}
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
        >
          <Edit3 className="size-3.5 text-neutral-500" />
          <span>Edit Profile</span>
        </button>

        {/* 2. WhatsApp Smart CRM Actions (with templates) */}
        {customer.phone && (
          <>
            <CustomerSmartCrmActions
              customer={{
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                preferredSize,
                totalOrders,
                totalSpent,
              }}
            />

            {/* Direct Call Button */}
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
            >
              <Phone className="size-3.5 text-blue-600" />
              <span>Call Phone</span>
            </a>
          </>
        )}

        {/* 3. Direct Email Button */}
        <a
          href={`mailto:${customer.email}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
        >
          <Mail className="size-3.5 text-neutral-500" />
          <span>Email</span>
        </a>
      </div>

      {/* Edit Profile Modal */}
      <CustomerEditModal
        customer={customer}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
