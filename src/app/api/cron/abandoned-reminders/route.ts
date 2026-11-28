import { auth } from "@/auth";
import { logSecurityAlert } from "@/lib/monitoring/security-logger";
import { processAbandonedReminders } from "@/lib/orders/abandoned-recovery";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

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

async function parseParams(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  let body: Record<string, unknown> = {};
  if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const rawOlderThan = body.olderThanMinutes ?? searchParams.get("olderThanMinutes");
  const rawCheckoutOlderThan =
    body.checkoutOlderThanMinutes ?? searchParams.get("checkoutOlderThanMinutes");
  const rawCartOlderThan = body.cartOlderThanMinutes ?? searchParams.get("cartOlderThanMinutes");
  const rawBatchSize =
    body.maxBatchSize ??
    body.batchSize ??
    (searchParams.get("maxBatchSize") || searchParams.get("batchSize"));
  const dryRun = body.dryRun === true || searchParams.get("dryRun") === "true";
  const ignoreQuietHours =
    body.ignoreQuietHours === true || searchParams.get("ignoreQuietHours") === "true";

  const olderThanMinutes =
    typeof rawOlderThan === "number"
      ? rawOlderThan
      : rawOlderThan
        ? parseInt(String(rawOlderThan), 10)
        : undefined;
  const checkoutOlderThanMinutes =
    typeof rawCheckoutOlderThan === "number"
      ? rawCheckoutOlderThan
      : rawCheckoutOlderThan
        ? parseInt(String(rawCheckoutOlderThan), 10)
        : undefined;
  const cartOlderThanMinutes =
    typeof rawCartOlderThan === "number"
      ? rawCartOlderThan
      : rawCartOlderThan
        ? parseInt(String(rawCartOlderThan), 10)
        : undefined;
  const maxBatchSize =
    typeof rawBatchSize === "number"
      ? rawBatchSize
      : rawBatchSize
        ? parseInt(String(rawBatchSize), 10)
        : undefined;

  return {
    olderThanMinutes:
      typeof olderThanMinutes === "number" && !isNaN(olderThanMinutes)
        ? olderThanMinutes
        : undefined,
    checkoutOlderThanMinutes:
      typeof checkoutOlderThanMinutes === "number" && !isNaN(checkoutOlderThanMinutes)
        ? checkoutOlderThanMinutes
        : undefined,
    cartOlderThanMinutes:
      typeof cartOlderThanMinutes === "number" && !isNaN(cartOlderThanMinutes)
        ? cartOlderThanMinutes
        : undefined,
    maxBatchSize:
      typeof maxBatchSize === "number" && !isNaN(maxBatchSize) ? maxBatchSize : undefined,
    dryRun,
    ignoreQuietHours,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await parseParams(req);
    const result = await processAbandonedReminders(params);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[Cron:abandonedReminders] Error:", err);
    logSecurityAlert("CRON_EXECUTION_FAILED", {
      endpoint: "/api/cron/abandoned-reminders",
      reason: err instanceof Error ? err.message : "unknown_error",
    });

    return NextResponse.json(
      {
        error: "Internal server error during abandoned reminders execution",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
