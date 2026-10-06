import "server-only";
import { getCurrentUser } from "./get-current-user";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

// Define the role hierarchy. Higher numbers indicate higher privileges.
export const ROLE_HIERARCHY: Record<Role, number> = {
  CUSTOMER: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
};

export class AuthRequiredError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

interface RequireOptions {
  /**
   * If true, throws AuthRequiredError/ForbiddenError instead of redirecting.
   * Useful for Route Handlers and Client-consumed Server Actions.
   */
  throw?: boolean;
}

/**
 * Ensures the user is authenticated.
 * Redirects to /login if there is no valid session, or throws if options.throw is true.
 */
export async function requireUser(options: RequireOptions = {}) {
  const user = await getCurrentUser();
  if (!user) {
    if (options.throw) throw new AuthRequiredError();
    redirect("/login");
  }
  return user;
}

/**
 * Ensures the authenticated user has at least the minimum specified role in the hierarchy.
 * Redirects to /login if unauthenticated.
 * Redirects to /unauthorized if authenticated but lacks the required role.
 * Throws errors instead if options.throw is true.
 */
export async function requireRole(minimumRole: Role, options: RequireOptions = {}) {
  const user = await requireUser(options);
  const userLevel = ROLE_HIERARCHY[user.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    if (options.throw) throw new ForbiddenError();
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Ensures the authenticated user has exactly one of the specific roles provided.
 */
export async function requireRoles(roles: Role[], options: RequireOptions = {}) {
  const user = await requireUser(options);
  if (!roles.includes(user.role)) {
    if (options.throw) throw new ForbiddenError();
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Non-blocking check to see if the current user has the minimum required role.
 * Safe to use in UI rendering logic.
 */
export async function hasRole(minimumRole: Role): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Non-blocking check to see if the current user has one of the specific roles.
 * Safe to use in UI rendering logic.
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}
