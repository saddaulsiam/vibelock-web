"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["ADMIN", "MANAGER", "STAFF", "CUSTOMER"]),
});

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

  // Prevent demoting self if sole admin
  if (currentAdmin.id === userId && newRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        success: false,
        error: "Cannot demote yourself when you are the sole administrator.",
      };
    }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
    });

    revalidatePath("/admin/admins");
    return { success: true };
  } catch (err: unknown) {
    console.error("[AdminUserActions] updateRole error:", err);
    return { success: false, error: "Failed to update user role." };
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
  await requireRole("ADMIN");
  const parsed = createAdminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { name, email, phone, role, password } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone?.trim() || null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        ...(cleanPhone ? [{ phone: cleanPhone }] : []),
      ],
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
    await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        phone: cleanPhone,
        role: role as Role,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    revalidatePath("/admin/admins");
    return { success: true };
  } catch (err: unknown) {
    console.error("[AdminUserActions] createAdminUser error:", err);
    return { success: false, error: "Failed to create administrator profile." };
  }
}

