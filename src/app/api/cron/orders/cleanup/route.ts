import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/auth";
import { cleanupExpiredOrders } from "@/lib/orders/expiration";
import { logSecurityAlert } from "@/lib/monitoring/security-logger";

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  const xCronSecret = req.headers.get("x-cron-secret");

  let providedSecret = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.slice(7).trim();
  } else if (xCronSecret) {
    providedSecret = xCronSecret.trim();
  }

  if (!providedSecret) {
    return false;
  }

  try {
    const expectedBuffer = Buffer.from(cronSecret);
    const providedBuffer = Buffer.from(providedSecret);

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // 1. Authorize via CRON_SECRET if configured and provided
  if (verifyCronSecret(req)) {
    return true;
  }

  // 2. Authorize via authenticated Staff/Admin session
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role && ["STAFF", "MANAGER", "ADMIN"].includes(role)) {
      return true;
    }
  } catch {
    // Proceed to unauthorized
  }

  return false;
}

function parseParams(req: NextRequest, bodyParams?: Record<string, unknown>) {
  const searchParams = req.nextUrl.searchParams;

  const rawBatchSize =
    searchParams.get("batchSize") ??
    (bodyParams?.batchSize !== undefined ? String(bodyParams.batchSize) : null);

  const rawOlderThan =
    searchParams.get("olderThanMinutes") ??
    (bodyParams?.olderThanMinutes !== undefined ? String(bodyParams.olderThanMinutes) : null);

  const batchSize = rawBatchSize ? parseInt(rawBatchSize, 10) : undefined;
  const olderThanMinutes = rawOlderThan ? parseInt(rawOlderThan, 10) : undefined;

  return {
    batchSize: !isNaN(batchSize ?? NaN) ? batchSize : undefined,
    olderThanMinutes: !isNaN(olderThanMinutes ?? NaN) ? olderThanMinutes : undefined,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { batchSize, olderThanMinutes } = parseParams(req);
    const result = await cleanupExpiredOrders({ batchSize, olderThanMinutes });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err: unknown) {
    console.error("[Cron:cleanupExpiredOrders] Error:", err);
    logSecurityAlert("CRON_EXECUTION_FAILED", {
      endpoint: "/api/cron/orders/cleanup",
      jobName: "cleanupExpiredOrders",
      reason: err instanceof Error ? err.message : "Internal server error",
    });
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let bodyParams: Record<string, unknown> | undefined;
    try {
      bodyParams = await req.json();
    } catch {
      // Body may be empty or non-JSON
    }

    const { batchSize, olderThanMinutes } = parseParams(req, bodyParams);
    const result = await cleanupExpiredOrders({ batchSize, olderThanMinutes });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err: unknown) {
    console.error("[Cron:cleanupExpiredOrders] Error:", err);
    logSecurityAlert("CRON_EXECUTION_FAILED", {
      endpoint: "/api/cron/orders/cleanup",
      jobName: "cleanupExpiredOrders",
      reason: err instanceof Error ? err.message : "Internal server error",
    });
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
