import type { Role } from "@prisma/client";

/**
 * Role hierarchy for Role-Based Access Control (RBAC).
 * Higher numbers indicate greater access privileges.
 * 
 * CUSTOMER (1) < STAFF (2) < MANAGER (3) < ADMIN (4)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  CUSTOMER: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
};

/**
 * Client-safe helper to verify if a user's role meets the minimum required role level.
 */
export function hasRequiredRole(
  userRole: Role | undefined | null,
  minimumRole: Role
): boolean {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 0);
}

