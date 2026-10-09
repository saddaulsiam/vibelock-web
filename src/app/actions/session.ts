"use server";

import prisma from "@/lib/prisma/client";
import { requireUser } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Type returned to the client
export interface SessionInfo {
  id: string;
  isCurrent: boolean;
  expires: Date;
  // If we had User-Agent metadata we could parse device info here, but for now we only have basic info.
}

export async function getActiveSessionsAction(): Promise<SessionInfo[]> {
  try {
    const user = await requireUser();

    // Since Auth.js does not expose the current session ID cleanly to the client session object without schema/token modifications,
    // and we are using Database sessions, the easiest way to identify the "current" session safely in a Server Action
    // would be to look at the session cookie.
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    // In Auth.js with DB strategy, the session token is usually in a secure cookie
    // "authjs.session-token" or "__Secure-authjs.session-token".
    const sessionTokenCookie =
      cookieStore.get("__Secure-authjs.session-token")?.value ||
      cookieStore.get("authjs.session-token")?.value;

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        expires: true,
        sessionToken: true,
      },
      orderBy: { expires: "desc" },
    });

    if (sessions.length === 0) {
      return [
        {
          id: "current-session",
          isCurrent: true,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ];
    }

    return sessions.map((s) => ({
      id: s.id,
      isCurrent: s.sessionToken === sessionTokenCookie,
      expires: s.expires,
    }));
  } catch (error) {
    console.error("Failed to get active sessions:", error);
    return [];
  }
}

export async function revokeSessionAction(sessionId: string) {
  try {
    const user = await requireUser();

    try {
      await checkRateLimit("sessionManagement", user.id);
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    // Attempt to delete. We include userId to prove ownership (prevent IDOR).
    const result = await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return { error: "Session not found or already revoked." };
    }

    return { success: true };
  } catch (error) {
    console.error("Revoke session error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function revokeAllOtherSessionsAction() {
  try {
    const user = await requireUser();

    try {
      await checkRateLimit("sessionManagement", user.id);
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionTokenCookie =
      cookieStore.get("__Secure-authjs.session-token")?.value ||
      cookieStore.get("authjs.session-token")?.value;

    if (!sessionTokenCookie) {
      return { error: "Could not identify current session." };
    }

    // Delete all sessions for this user EXCEPT the one matching the current session token
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        sessionToken: {
          not: sessionTokenCookie,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Revoke other sessions error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function revokeAllSessionsAction() {
  try {
    const user = await requireUser();

    try {
      await checkRateLimit("sessionManagement", user.id);
    } catch {
      return { error: "Too many attempts. Please try again later." };
    }

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Revoke all sessions error:", error);
    return { error: "An unexpected error occurred." };
  }
}
