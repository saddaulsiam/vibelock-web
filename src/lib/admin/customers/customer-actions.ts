"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { appConfig } from "@/lib/config/app";
import { sendPasswordResetEmail } from "@/lib/email/client";
import { getAdminCustomers, type CustomerSegment, type CustomerSortBy } from "./customer-queries";

export async function loadMoreAdminCustomersAction(options: {
  search?: string;
  segment?: CustomerSegment;
  sortBy?: CustomerSortBy;
  page: number;
  pageSize?: number;
}) {
  await requireRole("MANAGER");
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
  await requireRole("MANAGER");

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
  await requireRole("MANAGER");

  const id = input.id?.trim();
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
    // 1. Verify target exists and is strictly a CUSTOMER
    const existingCustomer = await prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: { id: true },
    });

    if (!existingCustomer) {
      return { success: false, error: "Customer profile not found." };
    }

    // 2. Check for conflicting email or phone in other users
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

    // 3. Atomically update only if role remains CUSTOMER
    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${id} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      const updateResult = await tx.user.updateMany({
        where: { id, role: "CUSTOMER" },
        data: {
          name,
          email,
          phone,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Customer profile not found.");
      }

      // If address fields provided, update default address or create one
      if (input.street || input.city) {
        const defaultAddress = await tx.address.findFirst({
          where: { userId: id, isDefault: true },
        });

        if (defaultAddress) {
          await tx.address.update({
            where: { id: defaultAddress.id },
            data: {
              street: input.street?.trim() || defaultAddress.street,
              city: input.city?.trim() || defaultAddress.city,
              state: input.state !== undefined ? input.state?.trim() || null : defaultAddress.state,
              zip: input.zip !== undefined ? input.zip?.trim() || null : defaultAddress.zip,
            },
          });
        } else {
          await tx.address.create({
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
    });

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update customer profile.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] updateAdminCustomerAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function addCustomerStaffNoteAction(
  customerId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  const cleanId = customerId?.trim();
  const cleanNote = note?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };
  if (!cleanNote) return { success: false, error: "Note content cannot be empty." };

  try {
    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_STAFF_NOTE",
          entityType: "Customer",
          entityId: cleanId,
          metadata: {
            note: cleanNote,
            authorName: admin.name || "Admin Staff",
            authorEmail: admin.email,
          },
        },
      });
    });

    revalidatePath(`/admin/customers/${cleanId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save staff note.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] addCustomerStaffNoteAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function toggleCustomerCodBlockAction(
  customerId: string,
  blocked: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  const cleanId = customerId?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      const now = new Date();

      await tx.user.update({
        where: { id: cleanId },
        data: {
          codBlocked: blocked,
          codBlockedAt: blocked ? now : null,
          codBlockedById: blocked ? admin.id : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: blocked ? "CUSTOMER_COD_RESTRICTED" : "CUSTOMER_COD_ALLOWED",
          entityType: "Customer",
          entityId: cleanId,
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
    });

    revalidatePath(`/admin/customers/${cleanId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update COD privileges.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] toggleCustomerCodBlockAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function deleteAdminCustomerAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  const cleanId = customerId?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };
  if (admin.id === cleanId) {
    return { success: false, error: "You cannot delete your own admin account." };
  }

  const customer = await prisma.user.findFirst({
    where: { id: cleanId, role: "CUSTOMER" },
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
    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      const deletedUser = await tx.user.deleteMany({
        where: { id: cleanId, role: "CUSTOMER" },
      });

      if (deletedUser.count === 0) {
        throw new Error("Customer profile not found.");
      }

      await tx.session.deleteMany({ where: { userId: cleanId } });
      await tx.address.deleteMany({ where: { userId: cleanId } });
      await tx.cart.deleteMany({ where: { userId: cleanId } });
      await tx.review.deleteMany({ where: { userId: cleanId } });
      await tx.account.deleteMany({ where: { userId: cleanId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: cleanId } });

      if (customer.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txAny = tx as any;
        if (typeof txAny.newsletterSubscriber?.updateMany === "function") {
          await txAny.newsletterSubscriber.updateMany({
            where: { email: customer.email.trim().toLowerCase() },
            data: { isActive: false },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_PERMANENTLY_DELETED",
          entityType: "Customer",
          entityId: cleanId,
          metadata: {
            deletedCustomerEmail: customer.email,
            deletedCustomerName: customer.name,
            deletedCustomerPhone: customer.phone,
            deletedBy: admin.name || admin.email,
            reason: "Lead/zero-orders customer removed by admin",
          },
        },
      });
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] deleteAdminCustomerAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function toggleCustomerAccountSuspensionAction(
  customerId: string,
  suspended: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  const cleanId = customerId?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };
  if (admin.id === cleanId) {
    return { success: false, error: "You cannot suspend your own admin account." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: suspended ? "CUSTOMER_ACCOUNT_SUSPENDED" : "CUSTOMER_ACCOUNT_ACTIVATED",
          entityType: "Customer",
          entityId: cleanId,
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
      });

      if (suspended) {
        await tx.session.deleteMany({ where: { userId: cleanId } });
      }
    });

    revalidatePath(`/admin/customers/${cleanId}`);
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update account suspension status.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] toggleCustomerAccountSuspensionAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function adminSendCustomerPasswordResetEmailAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  const cleanId = customerId?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };

  try {
    await checkRateLimit("adminCustomerSecurity", admin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many security reset requests. Please try again later." };
  }

  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours validity

    let recipientEmail: string;

    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string; email: string; name: string | null }>>`
        SELECT "id", "email", "name"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      const verifiedCustomer = lockedUsers[0];

      if (!verifiedCustomer.email || verifiedCustomer.email.includes("@pos.vibelock.com")) {
        throw new Error("Customer does not have a valid email address on file.");
      }

      recipientEmail = verifiedCustomer.email;

      await tx.passwordResetToken.create({
        data: {
          userId: verifiedCustomer.id,
          tokenHash,
          expiresAt,
        },
      });

      // Authoritative audit logging for admin-initiated password reset email (SEC-10)
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_PASSWORD_RESET_EMAIL_SENT",
          entityType: "Customer",
          entityId: verifiedCustomer.id,
          metadata: {
            targetEmail: recipientEmail,
            actorName: admin.name || admin.email,
          },
        },
      });
    });

    // Send email outside the transaction so database lock is not held during external request
    const sent = await sendPasswordResetEmail(recipientEmail!, rawToken);
    if (!sent) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return {
        success: false,
        error: "Failed to deliver reset email. Check email provider configuration.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initiate password reset email.";
    if (
      msg !== "Customer profile not found." &&
      msg !== "Customer does not have a valid email address on file."
    ) {
      console.error("[CustomerActions] adminSendCustomerPasswordResetEmailAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export async function adminGenerateCustomerPasswordResetLinkAction(
  customerId: string
): Promise<{ success: boolean; resetLink?: string; error?: string }> {
  const admin = await requireRole("ADMIN");

  const cleanId = customerId?.trim();
  if (!cleanId) return { success: false, error: "Customer ID is required." };

  try {
    await checkRateLimit("adminCustomerSecurity", admin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many security reset requests. Please try again later." };
  }

  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours validity

    let customerEmail: string;

    await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string; email: string; name: string | null }>>`
        SELECT "id", "email", "name"
        FROM "User"
        WHERE "id" = ${cleanId} AND "role" = 'CUSTOMER'::"Role"
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("Customer profile not found.");
      }

      const verifiedCustomer = lockedUsers[0];
      customerEmail = verifiedCustomer.email;

      await tx.passwordResetToken.create({
        data: {
          userId: verifiedCustomer.id,
          tokenHash,
          expiresAt,
        },
      });

      // Authoritative audit logging for admin reset link generation (SEC-10)
      // Strictly omit raw reset token and reset URL from audit log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CUSTOMER_PASSWORD_RESET_LINK_GENERATED",
          entityType: "Customer",
          entityId: verifiedCustomer.id,
          metadata: {
            targetEmail: customerEmail,
            actorName: admin.name || admin.email,
          },
        },
      });
    });

    const resetUrl = new URL("/reset-password", appConfig.url);
    resetUrl.searchParams.set("token", rawToken);

    return { success: true, resetLink: resetUrl.toString() };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate password reset link.";
    if (msg !== "Customer profile not found.") {
      console.error("[CustomerActions] adminGenerateCustomerPasswordResetLinkAction error:", err);
    }
    return { success: false, error: msg };
  }
}

export interface AdjustCustomerLoyaltyInput {
  customerId: string;
  pointsDelta: number;
  reason: string;
}

export async function adjustCustomerLoyaltyPointsAction(
  input: AdjustCustomerLoyaltyInput
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const admin = await requireRole("MANAGER", { throw: true });

  const { customerId, pointsDelta, reason } = input;

  if (!customerId) {
    return { success: false, error: "Customer ID is required." };
  }

  const delta = Math.trunc(pointsDelta);
  if (!Number.isFinite(delta) || delta === 0) {
    return { success: false, error: "Points adjustment must be a non-zero whole number." };
  }

  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 3) {
    return {
      success: false,
      error: "A valid reason (minimum 3 characters) is required for audit compliance.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, phone: true },
      });

      if (!user) {
        throw new Error("Customer not found.");
      }

      let account = await tx.loyaltyAccount.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.phone ? [{ phone: user.phone }] : []),
          ],
        },
      });

      if (account) {
        // Pessimistic row-level lock against concurrent admin adjustments
        await tx.$queryRaw`SELECT id FROM "LoyaltyAccount" WHERE id = ${account.id} FOR UPDATE`;
        const fresh = await tx.loyaltyAccount.findUnique({ where: { id: account.id } });
        if (fresh) account = fresh;
      }

      if (!account && delta < 0) {
        throw new Error("Cannot deduct points: customer has no loyalty account.");
      }

      const currentPoints = account?.points ?? 0;
      const newPoints = currentPoints + delta;

      if (newPoints < 0) {
        throw new Error(`Insufficient points: customer only has ${currentPoints} points.`);
      }

      const loyaltyConfig = await tx.loyaltySetting.findFirst();
      const plat = Number(loyaltyConfig?.platinumThreshold ?? 50000);
      const gold = Number(loyaltyConfig?.goldThreshold ?? 20000);
      const silv = Number(loyaltyConfig?.silverThreshold ?? 5000);

      const newLifetimePoints =
        delta > 0 ? (account?.lifetimePoints ?? 0) + delta : account?.lifetimePoints ?? 0;
      const lifetimeSpend = Number(account?.lifetimeSpend ?? 0);

      let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
      if (lifetimeSpend >= plat) tier = "PLATINUM";
      else if (lifetimeSpend >= gold) tier = "GOLD";
      else if (lifetimeSpend >= silv) tier = "SILVER";

      if (!account) {
        const phone = user.phone || `temp-${user.id}`;
        account = await tx.loyaltyAccount.create({
          data: {
            userId: user.id,
            phone,
            points: newPoints,
            lifetimePoints: newLifetimePoints,
            lifetimeSpend,
            tier,
          },
        });
      } else {
        account = await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: {
            points: newPoints,
            lifetimePoints: newLifetimePoints,
            tier,
            ...(user.id && !account.userId ? { userId: user.id } : {}),
          },
        });
      }

      await tx.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          type: "ADJUSTED",
          points: delta,
          balanceAfter: newPoints,
          reason: trimmedReason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOYALTY_POINTS_ADJUSTED",
          entityType: "Customer",
          entityId: user.id,
          metadata: {
            pointsDelta: delta,
            balanceAfter: newPoints,
            reason: trimmedReason,
            actorName: admin.name || admin.email,
          },
        },
      });

      return { newBalance: newPoints };
    });

    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath("/admin/customers");
    return { success: true, newBalance: result.newBalance };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to adjust points.";
    return { success: false, error: msg };
  }
}
