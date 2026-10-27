"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { appConfig } from "@/lib/config/app";
import { sendPasswordResetEmail } from "@/lib/email/client";
import {
  getAdminCustomers,
  type CustomerSegment,
  type CustomerSortBy,
} from "@/lib/admin/customer-queries";

export async function loadMoreAdminCustomersAction(options: {
  search?: string;
  segment?: CustomerSegment;
  sortBy?: CustomerSortBy;
  page: number;
  pageSize?: number;
}) {
  await requireRole("ADMIN");
  return getAdminCustomers(options);
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function createAdminCustomerAction(
  input: CreateCustomerInput
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  await requireRole("ADMIN");

  const name = input.name?.trim();
  const phone = input.phone?.trim();
  let email = input.email?.trim().toLowerCase();

  if (!name) {
    return { success: false, error: "Customer name is required." };
  }

  if (!phone) {
    return { success: false, error: "Customer phone number is required." };
  }

  // If email is omitted, generate standard POS placeholder email
  if (!email) {
    const cleanPhone = phone.replace(/\D/g, "");
    email = `customer-${cleanPhone || Date.now()}@pos.vibelock.com`;
  }

  try {
    // Check if email or phone already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: { email: true, phone: true },
    });

    if (existing) {
      if (existing.email === email) {
        return { success: false, error: `Customer with email "${email}" already exists.` };
      }
      if (existing.phone === phone) {
        return { success: false, error: `Customer with phone "${phone}" already exists.` };
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: "CUSTOMER",
        ...(input.street || input.city
          ? {
              addresses: {
                create: {
                  label: "Primary Delivery Address",
                  street: input.street?.trim() || "Address on file",
                  city: input.city?.trim() || "Dhaka",
                  state: input.state?.trim() || null,
                  zip: input.zip?.trim() || null,
                  country: "Bangladesh",
                  isDefault: true,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    revalidatePath("/admin/customers");
    return { success: true, customerId: newUser.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create customer profile.";
    console.error("[CustomerActions] createAdminCustomerAction error:", err);
    return { success: false, error: msg };
  }
}

export interface UpdateCustomerInput {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function updateAdminCustomerAction(
  input: UpdateCustomerInput
): Promise<{ success: boolean; error?: string }> {
  await requireRole("ADMIN");

  const { id } = input;
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim() || null;

  if (!id) {
    return { success: false, error: "Customer ID is required." };
  }

  if (!name) {
    return { success: false, error: "Customer name is required." };
  }

  if (!email) {
    return { success: false, error: "Customer email is required." };
  }

  try {
    // Check for conflicting email or phone in other users
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
      select: { email: true, phone: true },
    });

    if (conflict) {
      if (conflict.email === email) {
        return { success: false, error: `Email "${email}" is already used by another account.` };
      }
      if (conflict.phone === phone) {
        return { success: false, error: `Phone "${phone}" is already used by another account.` };
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone,
      },
    });

    // If address fields provided, update default address or create one
    if (input.street || input.city) {
      const defaultAddress = await prisma.address.findFirst({
        where: { userId: id, isDefault: true },
      });

      if (defaultAddress) {
        await prisma.address.update({
          where: { id: defaultAddress.id },
          data: {
            street: input.street?.trim() || defaultAddress.street,
            city: input.city?.trim() || defaultAddress.city,
            state: input.state !== undefined ? input.state?.trim() || null : defaultAddress.state,
            zip: input.zip !== undefined ? input.zip?.trim() || null : defaultAddress.zip,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            userId: id,
            label: "Primary Delivery Address",
            street: input.street?.trim() || "Address on file",
            city: input.city?.trim() || "Dhaka",
            state: input.state?.trim() || null,
            zip: input.zip?.trim() || null,
            country: "Bangladesh",
            isDefault: true,
          },
        });
      }
    }

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update customer profile.";
    console.error("[CustomerActions] updateAdminCustomerAction error:", err);
    return { success: false, error: msg };
  }
}

export async function addCustomerStaffNoteAction(
  customerId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  const cleanNote = note?.trim();
  if (!customerId) return { success: false, error: "Customer ID is required." };
  if (!cleanNote) return { success: false, error: "Note content cannot be empty." };

  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "CUSTOMER_STAFF_NOTE",
        entityType: "Customer",
        entityId: customerId,
        metadata: {
          note: cleanNote,
          authorName: admin.name || "Admin Staff",
          authorEmail: admin.email,
        },
      },
    });

    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[CustomerActions] addCustomerStaffNoteAction error:", err);
    return { success: false, error: "Failed to save staff note." };
  }
}

export async function toggleCustomerCodBlockAction(
  customerId: string,
  blocked: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  if (!customerId) return { success: false, error: "Customer ID is required." };

  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: blocked ? "CUSTOMER_COD_RESTRICTED" : "CUSTOMER_COD_ALLOWED",
        entityType: "Customer",
        entityId: customerId,
        metadata: {
          blocked,
          reason:
            reason?.trim() ||
            (blocked
              ? "Restricted by store admin due to high cancellation/return risk"
              : "COD privileges restored by store admin"),
          authorName: admin.name || "Admin Staff",
        },
      },
    });

    revalidatePath(`/admin/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[CustomerActions] toggleCustomerCodBlockAction error:", err);
    return { success: false, error: "Failed to update COD privileges." };
  }
}

export async function deleteAdminCustomerAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  if (!customerId) return { success: false, error: "Customer ID is required." };
  if (admin.id === customerId) {
    return { success: false, error: "You cannot delete your own admin account." };
  }

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      _count: { select: { orders: true } },
    },
  });

  if (!customer) return { success: false, error: "Customer profile not found." };

  // SAFETY RULE: Customers with past orders MUST NOT be permanently deleted
  if (customer._count.orders > 0) {
    return {
      success: false,
      error: `Cannot permanently delete customer "${customer.name || customer.email}" because they have ${customer._count.orders} order record(s). To protect accounting, sales invoices, and courier fraud history, use "Suspend Account" or "Restrict COD" instead.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: customerId } }),
      prisma.address.deleteMany({ where: { userId: customerId } }),
      prisma.cart.deleteMany({ where: { userId: customerId } }),
      prisma.review.deleteMany({ where: { userId: customerId } }),
      prisma.account.deleteMany({ where: { userId: customerId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: customerId } }),
      prisma.user.delete({ where: { id: customerId } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_PERMANENTLY_DELETED",
          entityType: "Customer",
          entityId: customerId,
          metadata: {
            deletedCustomerEmail: customer.email,
            deletedCustomerName: customer.name,
            deletedCustomerPhone: customer.phone,
            deletedBy: admin.name || admin.email,
            reason: "Lead/zero-orders customer removed by admin",
          },
        },
      }),
    ]);

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer.";
    console.error("[CustomerActions] deleteAdminCustomerAction error:", err);
    return { success: false, error: msg };
  }
}

export async function toggleCustomerAccountSuspensionAction(
  customerId: string,
  suspended: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  if (!customerId) return { success: false, error: "Customer ID is required." };
  if (admin.id === customerId) {
    return { success: false, error: "You cannot suspend your own admin account." };
  }

  try {
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: suspended ? "CUSTOMER_ACCOUNT_SUSPENDED" : "CUSTOMER_ACCOUNT_ACTIVATED",
          entityType: "Customer",
          entityId: customerId,
          metadata: {
            suspended,
            reason:
              reason?.trim() ||
              (suspended
                ? "Account suspended by store manager for policy violation"
                : "Account privileges reactivated by store manager"),
            authorName: admin.name || "Admin Staff",
          },
        },
      }),
      // Immediately terminate all active customer sessions when suspended
      ...(suspended ? [prisma.session.deleteMany({ where: { userId: customerId } })] : []),
    ]);

    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: unknown) {
    console.error("[CustomerActions] toggleCustomerAccountSuspensionAction error:", err);
    return { success: false, error: "Failed to update account suspension status." };
  }
}

export async function adminSendCustomerPasswordResetEmailAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole("ADMIN");

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  if (!customer) return { success: false, error: "Customer profile not found." };
  if (!customer.email || customer.email.includes("@pos.vibelock.com")) {
    return { success: false, error: "Customer does not have a valid email address on file." };
  }

  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours validity

    await prisma.passwordResetToken.create({
      data: {
        userId: customer.id,
        tokenHash,
        expiresAt,
      },
    });

    const sent = await sendPasswordResetEmail(customer.email, rawToken);
    if (!sent) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return { success: false, error: "Failed to deliver reset email. Check email provider configuration." };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initiate password reset email.";
    console.error("[CustomerActions] adminSendCustomerPasswordResetEmailAction error:", err);
    return { success: false, error: msg };
  }
}

export async function adminGenerateCustomerPasswordResetLinkAction(
  customerId: string
): Promise<{ success: boolean; resetLink?: string; error?: string }> {
  await requireRole("ADMIN");

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, email: true, name: true },
  });

  if (!customer) return { success: false, error: "Customer profile not found." };

  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours validity

    await prisma.passwordResetToken.create({
      data: {
        userId: customer.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = new URL("/reset-password", appConfig.url);
    resetUrl.searchParams.set("token", rawToken);

    return { success: true, resetLink: resetUrl.toString() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate password reset link.";
    console.error("[CustomerActions] adminGenerateCustomerPasswordResetLinkAction error:", err);
    return { success: false, error: msg };
  }
}


