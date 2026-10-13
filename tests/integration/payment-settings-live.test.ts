import { describe, test, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma/client";
import {
  isPaymentMethodEnabled,
  updatePaymentMethodSetting,
  getPaymentSettingsOverview,
} from "@/lib/settings/payment-settings";

describe("VibeLock Stage 3 — Live Database Persistence Verification on localhost:5432/vibelock_test", () => {
  let baselinePmsCount = 0;
  let baselineAuditCount = 0;
  let baselineProductCount = 0;
  let baselineVariantCount = 0;
  let baselineInvCount = 0;
  let baselineOrderCount = 0;
  let baselineUserCount = 0;

  const testAuditLogIds: string[] = [];

  beforeAll(async () => {
    // 1. Mandatory Safety Gate Assertion
    const dbUrl = process.env.DATABASE_URL || "";
    const directUrl = process.env.DIRECT_URL || "";
    expect(dbUrl).toBeTruthy();
    expect(directUrl).toBeTruthy();

    const u = new URL(dbUrl);
    const uDirect = new URL(directUrl);

    if (
      (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") ||
      u.port !== "5432" ||
      u.pathname !== "/vibelock_test"
    ) {
      throw new Error(`ABORT: DATABASE_URL is not localhost:5432/vibelock_test (${u.hostname}:${u.port}${u.pathname})`);
    }

    if (
      (uDirect.hostname !== "localhost" && uDirect.hostname !== "127.0.0.1") ||
      uDirect.port !== "5432" ||
      uDirect.pathname !== "/vibelock_test"
    ) {
      throw new Error(`ABORT: DIRECT_URL is not localhost:5432/vibelock_test (${uDirect.hostname}:${uDirect.port}${uDirect.pathname})`);
    }

    // 2. Capture Baseline
    baselinePmsCount = await prisma.paymentMethodSetting.count();
    baselineAuditCount = await prisma.auditLog.count();
    baselineProductCount = await prisma.product.count();
    baselineVariantCount = await prisma.productVariant.count();
    baselineInvCount = await prisma.inventoryTransaction.count();
    baselineOrderCount = await prisma.order.count();
    baselineUserCount = await prisma.user.count();

    expect(baselinePmsCount).toBe(0);
    expect(baselineAuditCount).toBe(70);
    expect(baselineProductCount).toBe(1736);
    expect(baselineVariantCount).toBe(1786);
    expect(baselineInvCount).toBe(1612);
    expect(baselineOrderCount).toBe(335);
    expect(baselineUserCount).toBe(1182);
  });

  afterAll(async () => {
    // 5. Cleanup and Restoration
    if (testAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: testAuditLogIds } },
      });
    }

    await prisma.paymentMethodSetting.deleteMany({
      where: { code: { in: ["COD", "SSLCOMMERZ"] } },
    });

    // Recheck exact baseline match
    const finalPmsCount = await prisma.paymentMethodSetting.count();
    const finalAuditCount = await prisma.auditLog.count();
    const finalProductCount = await prisma.product.count();
    const finalVariantCount = await prisma.productVariant.count();
    const finalInvCount = await prisma.inventoryTransaction.count();
    const finalOrderCount = await prisma.order.count();
    const finalUserCount = await prisma.user.count();

    expect(finalPmsCount).toBe(baselinePmsCount);
    expect(finalAuditCount).toBe(baselineAuditCount);
    expect(finalProductCount).toBe(baselineProductCount);
    expect(finalVariantCount).toBe(baselineVariantCount);
    expect(finalInvCount).toBe(baselineInvCount);
    expect(finalOrderCount).toBe(baselineOrderCount);
    expect(finalUserCount).toBe(baselineUserCount);
  });

  test("1. Baseline missing-row fallback before live writes", async () => {
    // When no row exists, COD defaults to true
    const codEnabled = await isPaymentMethodEnabled("COD");
    expect(codEnabled).toBe(true);

    // Unconfigured MFS providers default to false
    const bkashEnabled = await isPaymentMethodEnabled("BKASH");
    expect(bkashEnabled).toBe(false);
  });

  test("2. Live write: persist COD=false and verify AuditLog", async () => {
    // Real service call to persist COD as false
    const updateResult = await updatePaymentMethodSetting("COD", false);
    expect(updateResult.success).toBe(true);

    // Read back directly from database
    const dbRow = await prisma.paymentMethodSetting.findUnique({
      where: { code: "COD" },
    });
    expect(dbRow).not.toBeNull();
    expect(dbRow?.code).toBe("COD");
    expect(dbRow?.name).toBe("Cash on Delivery");
    expect(dbRow?.isEnabled).toBe(false);

    // Read back via application service function
    const activeStatus = await isPaymentMethodEnabled("COD");
    expect(activeStatus).toBe(false);

    // Verify AuditLog creation
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entityType: "PaymentMethodSetting",
        entityId: dbRow?.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.action).toBe("PAYMENT_METHOD_SETTING_UPDATED");
    expect(auditRecord?.actorId).toBeNull();

    const metadata = auditRecord?.metadata as { code: string; previousState: unknown; newState: unknown };
    expect(metadata.code).toBe("COD");
    expect(metadata.previousState).toBe("UNINITIALIZED");
    expect(metadata.newState).toBe(false);

    if (auditRecord) {
      testAuditLogIds.push(auditRecord.id);
    }
  });

  test("3. Live update: toggle COD=true, verify idempotency (no duplicate rows) and audit transition", async () => {
    const updateResult = await updatePaymentMethodSetting("COD", true);
    expect(updateResult.success).toBe(true);

    // Confirm strictly 1 row exists for COD (no duplicates)
    const allCodRows = await prisma.paymentMethodSetting.findMany({
      where: { code: "COD" },
    });
    expect(allCodRows.length).toBe(1);
    expect(allCodRows[0].isEnabled).toBe(true);

    // Service readback reflects true
    const activeStatus = await isPaymentMethodEnabled("COD");
    expect(activeStatus).toBe(true);

    // Verify state transition in AuditLog: previousState false -> newState true
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entityType: "PaymentMethodSetting",
        entityId: allCodRows[0].id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.action).toBe("PAYMENT_METHOD_SETTING_UPDATED");

    const metadata = auditRecord?.metadata as { code: string; previousState: unknown; newState: unknown };
    expect(metadata.code).toBe("COD");
    expect(metadata.previousState).toBe(false);
    expect(metadata.newState).toBe(true);

    if (auditRecord) {
      testAuditLogIds.push(auditRecord.id);
    }
  });

  test("4. Live write: persist SSLCOMMERZ=false and verify AuditLog", async () => {
    const updateResult = await updatePaymentMethodSetting("SSLCOMMERZ", false);
    expect(updateResult.success).toBe(true);

    const sslRow = await prisma.paymentMethodSetting.findUnique({
      where: { code: "SSLCOMMERZ" },
    });
    expect(sslRow).not.toBeNull();
    expect(sslRow?.code).toBe("SSLCOMMERZ");
    expect(sslRow?.name).toBe("SSLCOMMERZ Gateway");
    expect(sslRow?.isEnabled).toBe(false);

    // Total rows in PaymentMethodSetting is exactly 2 (COD and SSLCOMMERZ)
    const totalPms = await prisma.paymentMethodSetting.count();
    expect(totalPms).toBe(2);

    // Verify AuditLog for SSLCOMMERZ
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entityType: "PaymentMethodSetting",
        entityId: sslRow?.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditRecord).not.toBeNull();
    expect(auditRecord?.action).toBe("PAYMENT_METHOD_SETTING_UPDATED");

    const metadata = auditRecord?.metadata as { code: string; previousState: unknown; newState: unknown };
    expect(metadata.code).toBe("SSLCOMMERZ");
    expect(metadata.previousState).toBe("UNINITIALIZED");
    expect(metadata.newState).toBe(false);

    if (auditRecord) {
      testAuditLogIds.push(auditRecord.id);
    }
  });

  test("5. Overview service reflects live persisted state", async () => {
    const overview = await getPaymentSettingsOverview();
    expect(overview.hasPersistenceStore).toBe(true);
    expect(overview.persistenceBlocker).toBeUndefined();

    const codStatus = overview.methods.find((m) => m.code === "COD");
    expect(codStatus?.isPersisted).toBe(true);
    expect(codStatus?.isEnabled).toBe(true);

    const sslStatus = overview.methods.find((m) => m.code === "SSLCOMMERZ");
    expect(sslStatus?.isPersisted).toBe(true);
    expect(sslStatus?.isEnabled).toBe(false);
  });
});
