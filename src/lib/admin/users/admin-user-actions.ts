"use server";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["ADMIN", "MANAGER", "STAFF", "CUSTOMER"]),
});

function resolveActorId(id: unknown): string | null {
  return typeof id === "string" && z.string().uuid().safeParse(id).success ? id : null;
}

export type PromotionUserPreview = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isEmailVerified: boolean;
};

export async function lookupUserByEmailForPromotionAction(
  email: string
): Promise<{ success: boolean; user?: PromotionUserPreview; error?: string }> {
  const admin = await requireRole("ADMIN");

  try {
    await checkRateLimit("adminUserManagement", admin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many admin management attempts. Please try again later." };
  }

  const parsed = z.string().trim().email("Please enter a valid email address.").safeParse(email);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid email address." };
  }

  const cleanEmail = parsed.data.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return { success: false, error: "No registered user found with this email address." };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: Boolean(user.emailVerified),
      },
    };
  } catch (err: unknown) {
    console.error("[AdminUserActions] lookupUserByEmailForPromotion error:", err);
    return { success: false, error: "Failed to look up user." };
  }
}

const promoteExistingUserSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export async function promoteExistingUserAction(input: {
  userId: string;
  newRole: "ADMIN" | "MANAGER" | "STAFF";
}): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireRole("ADMIN");
  const parsed = promoteExistingUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid promotion payload." };
  }

  const { userId, newRole } = parsed.data;

  try {
    await checkRateLimit("adminUserManagement", currentAdmin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many admin management attempts. Please try again later." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (typeof tx.$executeRaw === "function") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(982347102)`;
      }

      const lockedUsers = await tx.$queryRaw<
        Array<{
          id: string;
          role: Role;
          email: string;
          name: string | null;
          emailVerified: Date | null;
        }>
      >`
        SELECT "id", "role", "email", "name", "emailVerified"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("User not found.");
      }

      const currentUser = lockedUsers[0];

      if (currentUser.role !== "CUSTOMER") {
        throw new Error("This user already has staff or administrator access.");
      }

      if (!currentUser.emailVerified) {
        throw new Error(
          "Cannot promote an unverified customer account. The user must verify their email first."
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { role: newRole as Role },
      });

      // Invalidate active sessions and outstanding reset tokens on privilege elevation
      await tx.session.deleteMany({
        where: { userId },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      await tx.auditLog.create({
        data: {
          actorId: resolveActorId(currentAdmin.id),
          action: "ADMIN_USER_ROLE_UPDATED",
          entityType: "User",
          entityId: userId,
          metadata: {
            targetEmail: currentUser.email,
            previousRole: currentUser.role,
            newRole,
            actorName: currentAdmin.name || currentAdmin.email,
            promotionFlow: true,
          },
        },
      });
    });

    revalidatePath("/admin/admins");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to promote user.";
    console.error("[AdminUserActions] promoteExistingUser error:", err);
    return { success: false, error: msg };
  }
}

export async function updateAdminUserRoleAction(input: {
  userId: string;
  newRole: Role;
}): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireRole("ADMIN");
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid role payload." };
  }

  const { userId, newRole } = parsed.data;

  // Rate limiting for administrative user/role operations bound to authenticated admin ID (SEC-10)
  try {
    await checkRateLimit("adminUserManagement", currentAdmin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many admin management attempts. Please try again later." };
  }

  // Prevent demoting self if sole admin (pre-check)
  if (currentAdmin.id === userId && newRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        success: false,
        error: "Cannot demote yourself when you are the sole administrator.",
      };
    }
  }

  let previousRole: Role | null = null;
  let targetUserEmail = "";

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Acquire PostgreSQL transaction-scoped advisory lock to serialize competing admin role mutations
      if (typeof tx.$executeRaw === "function") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(982347102)`;
      }

      // 2. Lock the target user row to serialize role changes with concurrent password reset operations
      const lockedUsers = await tx.$queryRaw<
        Array<{ id: string; role: Role; email: string; name: string | null }>
      >`
        SELECT "id", "role", "email", "name"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
      `;

      if (lockedUsers.length === 0) {
        throw new Error("User not found.");
      }

      const currentUser = lockedUsers[0];
      previousRole = currentUser.role;
      targetUserEmail = currentUser.email;

      // 3. Prevent demoting the sole remaining administrator (self or another admin)
      if (currentUser.role === "ADMIN" && newRole !== "ADMIN") {
        const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          throw new Error(
            currentAdmin.id === userId
              ? "Cannot demote yourself when you are the sole administrator."
              : "Cannot demote the sole remaining administrator."
          );
        }
      }

      // If the role is unchanged, do not invalidate sessions or tokens unnecessarily
      if (currentUser.role === newRole) {
        return;
      }

      // 4. Update the user role
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole as Role },
      });

      // 5. Terminate all active sessions for the modified user to prevent privilege retention
      await tx.session.deleteMany({
        where: { userId },
      });

      // 6. Invalidate all outstanding password reset tokens on role change
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      // 7. Authoritatively record role change audit log atomically inside the transaction (SEC-10)
      const actorId =
        typeof currentAdmin.id === "string" && z.string().uuid().safeParse(currentAdmin.id).success
          ? currentAdmin.id
          : null;

      await tx.auditLog.create({
        data: {
          actorId,
          action: "ADMIN_USER_ROLE_UPDATED",
          entityType: "User",
          entityId: userId,
          metadata: {
            targetEmail: targetUserEmail,
            previousRole,
            newRole,
            actorName: currentAdmin.name || currentAdmin.email,
          },
        },
      });
    });

    revalidatePath("/admin/admins");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user role.";
    console.error("[AdminUserActions] updateRole error:", err);
    return { success: false, error: msg };
  }
}

const createAdminUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function createAdminUserAction(input: {
  name: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN");

  // Rate limiting for admin user creation bound to authenticated admin ID (SEC-10)
  try {
    await checkRateLimit("adminUserManagement", admin.id, { skipIp: true });
  } catch {
    return { success: false, error: "Too many admin creation attempts. Please try again later." };
  }

  const parsed = createAdminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { name, email, phone, role, password } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone?.trim() || null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: cleanEmail }, ...(cleanPhone ? [{ phone: cleanPhone }] : [])],
    },
  });

  if (existing) {
    if (existing.email === cleanEmail) {
      return { success: false, error: "A user with this email address already exists." };
    }
    return { success: false, error: "A user with this phone number already exists." };
  }

  try {
    const passwordHash = await hash(password, 12);
    const userId = crypto.randomUUID();
    const actorId =
      typeof admin.id === "string" && z.string().uuid().safeParse(admin.id).success
        ? admin.id
        : null;

    // Atomically create user and audit log in one transaction (SEC-10)
    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name,
          email: cleanEmail,
          phone: cleanPhone,
          role: role as Role,
          passwordHash,
          emailVerified: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          action: "ADMIN_USER_CREATED",
          entityType: "User",
          entityId: userId,
          metadata: {
            createdRole: role,
            targetEmail: cleanEmail,
            actorName: admin.name || admin.email,
          },
        },
      }),
    ]);

    revalidatePath("/admin/admins");
    return { success: true };
  } catch (err: unknown) {
    console.error("[AdminUserActions] createAdminUser error:", err);
    return { success: false, error: "Failed to create administrator profile." };
  }
}
