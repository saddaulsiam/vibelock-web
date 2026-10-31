import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
  emailVerified: Date | null;
  phoneVerified: Date | null;
}

export interface AdminUserStats {
  totalStaff: number;
  admins: number;
  managers: number;
  staff: number;
}

export async function getAdminUserStats(): Promise<AdminUserStats> {
  await requireRole("ADMIN");

  const [totalStaff, admins, managers, staff] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["ADMIN", "MANAGER", "STAFF"] } } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "MANAGER" } }),
    prisma.user.count({ where: { role: "STAFF" } }),
  ]);

  return { totalStaff, admins, managers, staff };
}

export async function getAdminUsers(options?: {
  role?: string;
  search?: string;
}): Promise<AdminUserListItem[]> {
  await requireRole("ADMIN");

  const validRoles: Role[] = ["ADMIN", "MANAGER", "STAFF"];
  const roleFilter =
    options?.role && validRoles.includes(options.role as Role)
      ? (options.role as Role)
      : undefined;

  const search = options?.search?.trim();

  const where: {
    role: Role | { in: Role[] };
    OR?: Array<
      | { name: { contains: string; mode: "insensitive" } }
      | { email: { contains: string; mode: "insensitive" } }
      | { phone: { contains: string; mode: "insensitive" } }
    >;
  } = {
    role: roleFilter ? roleFilter : { in: validRoles },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      phoneVerified: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

