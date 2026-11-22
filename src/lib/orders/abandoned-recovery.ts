import "server-only";

import prisma from "@/lib/prisma/client";
import { sendSmsNotification } from "@/lib/sms/client";
import { sendAbandonedCartEmail } from "@/lib/email/abandoned-cart-email";
import { SITE_URL } from "@/lib/seo/site";

export const DEFAULT_ABANDONED_REMINDER_MINUTES = 30;
export const MAX_REMINDER_LOOKBACK_HOURS = 24;
export const DEFAULT_REMINDER_BATCH_SIZE = 50;

export interface AbandonedReminderOptions {
  olderThanMinutes?: number;
  maxBatchSize?: number;
  dryRun?: boolean;
}

export interface AbandonedReminderResult {
  scannedOrders: number;
  remindedOrders: number;
  scannedCarts: number;
  remindedCarts: number;
  skipped: number;
  errors: Array<{ targetId: string; error: string }>;
}

function cleanPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;

  // 10 digits without leading 0 (e.g. 1712345678 -> 8801712345678)
  if (/^1[3-9]\d{8}$/.test(digits)) return `880${digits}`;
  // 11 digits starting with 01 (e.g. 01712345678 -> 8801712345678)
  if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`;
  // 13 digits starting with 8801 (e.g. 8801712345678)
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits;
  // 15 digits starting with 008801 (e.g. 008801712345678)
  if (/^008801[3-9]\d{8}$/.test(digits)) return digits.slice(2);

  return null;
}

const COMMON_HONORIFICS = new Set([
  "md",
  "md.",
  "mohammad",
  "mohammed",
  "muhammad",
  "mst",
  "mst.",
  "most",
  "most.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "dr",
  "dr.",
]);

function getCleanCustomerName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || lower === "undefined" || lower === "null" || lower === "customer") {
    return "";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  // If first token is an honorific/title (e.g. "Md.", "Mr."), prefer the second token
  if (parts.length > 1 && COMMON_HONORIFICS.has(parts[0].toLowerCase())) {
    return parts[1];
  }

  return parts[0];
}

/**
 * Dispatches automated reminders (SMS + Email) to customers who entered checkout
 * or added items to their cart but left without completing payment.
 *
 * Concurrency-safe & strictly idempotent:
 * - Records OrderHistory / AuditLog entry so each customer is reminded only once.
 * - Skips already paid, active, or previously reminded orders.
 */
export async function processAbandonedReminders(
  options?: AbandonedReminderOptions
): Promise<AbandonedReminderResult> {
  const olderThanMinutes = Math.max(
    5,
    options?.olderThanMinutes ?? DEFAULT_ABANDONED_REMINDER_MINUTES
  );
  const batchSize = Math.min(
    100,
    Math.max(1, options?.maxBatchSize ?? DEFAULT_REMINDER_BATCH_SIZE)
  );
  const dryRun = Boolean(options?.dryRun);

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - olderThanMinutes * 60 * 1000);
  const oldestCutoffTime = new Date(
    now.getTime() - MAX_REMINDER_LOOKBACK_HOURS * 60 * 60 * 1000
  );

  const result: AbandonedReminderResult = {
    scannedOrders: 0,
    remindedOrders: 0,
    scannedCarts: 0,
    remindedCarts: 0,
    skipped: 0,
    errors: [],
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Process Abandoned Checkouts (Orders initiated but unpaid)
  // ─────────────────────────────────────────────────────────────
  try {
    const candidateOrders = await prisma.order.findMany({
      where: {
        paymentMethod: "ONLINE",
        status: "PENDING",
        paymentStatus: { in: ["PENDING", "INITIATED", "FAILED"] },
        createdAt: {
          lte: cutoffTime,
          gte: oldestCutoffTime,
        },
        // Never remind orders that were already reminded (Idempotency Guard)
        history: {
          none: {
            notes: { contains: "ABANDONED_REMINDER" },
          },
        },
        // Never remind orders that have any successful payment
        payments: {
          none: {
            status: "SUCCESS",
          },
        },
      },
      include: {
        items: true,
      },
      take: batchSize,
      orderBy: { createdAt: "asc" },
    });

    result.scannedOrders = candidateOrders.length;

    for (const order of candidateOrders) {
      try {
        // Concurrency Guard: double check if another worker reminded this order in competing batch
        const alreadyReminded = await prisma.orderHistory.findFirst({
          where: {
            orderId: order.id,
            notes: { contains: "ABANDONED_REMINDER" },
          },
          select: { id: true },
        });

        if (alreadyReminded) {
          result.skipped += 1;
          continue;
        }

        // If customer placed a subsequent non-cancelled order, skip reminding about older dropped checkout
        if (order.userId) {
          const subsequentOrder = await prisma.order.findFirst({
            where: {
              userId: order.userId,
              id: { not: order.id },
              createdAt: { gte: order.createdAt },
              status: { not: "CANCELLED" },
            },
            select: { id: true },
          });

          if (subsequentOrder) {
            result.skipped += 1;
            continue;
          }
        }

        const firstName = getCleanCustomerName(order.customerName);
        const nameGreeting = firstName ? `${firstName}` : "সম্মানিত গ্রাহক";
        const recoveryUrl = `${SITE_URL}/order-success/${order.orderNumber}`;

        let smsSent = false;
        let emailSent = false;

        if (!dryRun) {
          // A. Send SMS Notification
          const targetPhone = cleanPhone(order.customerPhone);
          if (targetPhone) {
            const smsBody = `আসসালামু আলাইকুম ${nameGreeting}! VibeLock-এ আপনার #${order.orderNumber} অর্ডারটি পেন্ডিং রয়েছে। স্টক শেষ হওয়ার আগেই অর্ডার সম্পন্ন করতে ভিজিট করুন: ${recoveryUrl} (হেল্পলাইন: 01311333277)`;

            smsSent = await sendSmsNotification({
              phone: targetPhone,
              message: smsBody,
              purpose: "abandoned_cart_recovery",
            });
          }

          // B. Send Email Notification
          if (order.customerEmail && order.customerEmail.includes("@")) {
            emailSent = await sendAbandonedCartEmail({
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              orderNumber: order.orderNumber,
              recoveryUrl,
              items: order.items.map((it) => ({
                productName: it.productName,
                size: it.size,
                color: it.color,
                quantity: it.quantity,
                unitPrice: Number(it.unitPrice),
                lineTotal: Number(it.lineTotal),
              })),
              subtotal: Number(order.subtotal),
              total: Number(order.total),
            });
          }

          // C. Record Idempotency Entry in OrderHistory
          await prisma.orderHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              notes: `ABANDONED_REMINDER_SENT: SMS=${smsSent ? "OK" : "SKIP"}, Email=${emailSent ? "OK" : "SKIP"} at ${new Date().toISOString()}`,
            },
          });
        }

        result.remindedOrders += 1;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[processAbandonedReminders] Error reminding order ${order.orderNumber}:`,
          err
        );
        result.errors.push({ targetId: order.orderNumber, error: errorMsg });
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[processAbandonedReminders] Failed to scan candidate orders:", err);
    result.errors.push({ targetId: "SCAN_ORDERS_FAIL", error: errorMsg });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Process Abandoned Active Carts (Logged-in users with items)
  // ─────────────────────────────────────────────────────────────
  try {
    const candidateCarts = await prisma.cart.findMany({
      where: {
        userId: { not: null },
        updatedAt: {
          lte: cutoffTime,
          gte: oldestCutoffTime,
        },
        items: {
          some: {},
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      take: batchSize,
      orderBy: { updatedAt: "asc" },
    });

    result.scannedCarts = candidateCarts.length;

    for (const cart of candidateCarts) {
      if (!cart.user) continue;

      try {
        const userId = cart.user.id;

        // Check if user already placed a confirmed order in the last 24 hours
        const recentOrder = await prisma.order.findFirst({
          where: {
            userId,
            createdAt: { gte: oldestCutoffTime },
            status: { not: "CANCELLED" },
          },
          select: { id: true },
        });

        if (recentOrder) {
          result.skipped += 1;
          continue;
        }

        // Check if user already received an abandoned cart reminder in the last 24 hours (Indexed via actorId)
        const priorAuditReminder = await prisma.auditLog.findFirst({
          where: {
            actorId: userId,
            action: "ABANDONED_CART_REMINDER",
            createdAt: { gte: oldestCutoffTime },
          },
          select: { id: true },
        });

        if (priorAuditReminder) {
          result.skipped += 1;
          continue;
        }

        const firstName = getCleanCustomerName(cart.user.name);
        const nameGreeting = firstName ? `${firstName}` : "সম্মানিত গ্রাহক";
        const recoveryUrl = `${SITE_URL}/cart`;

        let smsSent = false;
        let emailSent = false;

        const subtotal = cart.items.reduce((sum, item) => {
          const effective =
            item.variant.discountPrice !== null
              ? Number(item.variant.discountPrice)
              : Number(item.variant.sellingPrice);
          return sum + effective * item.quantity;
        }, 0);

        if (!dryRun) {
          // Send SMS if user has phone
          const targetPhone = cleanPhone(cart.user.phone);
          if (targetPhone) {
            const smsBody = `আসসালামু আলাইকুম ${nameGreeting}! VibeLock-এ আপনার ব্যাগপ্যাকের আইটেমগুলো অপেক্ষা করছে। স্টক শেষ হওয়ার আগেই অর্ডার কনফার্ম করতে ভিজিট করুন: ${recoveryUrl} (হেল্পলাইন: 01311333277)`;
            smsSent = await sendSmsNotification({
              phone: targetPhone,
              message: smsBody,
              purpose: "abandoned_cart_recovery",
            });
          }

          // Send Email if user has email
          if (cart.user.email && cart.user.email.includes("@")) {
            emailSent = await sendAbandonedCartEmail({
              customerName: cart.user.name,
              customerEmail: cart.user.email,
              recoveryUrl,
              items: cart.items.map((it) => ({
                productName: it.variant.product.name,
                size: it.variant.size,
                color: it.variant.color,
                quantity: it.quantity,
                unitPrice:
                  it.variant.discountPrice !== null
                    ? Number(it.variant.discountPrice)
                    : Number(it.variant.sellingPrice),
                lineTotal:
                  (it.variant.discountPrice !== null
                    ? Number(it.variant.discountPrice)
                    : Number(it.variant.sellingPrice)) * it.quantity,
              })),
              subtotal,
              total: subtotal,
            });
          }

          // Record AuditLog for rate limiting and deduplication (Indexed via actorId)
          await prisma.auditLog.create({
            data: {
              actorId: userId,
              action: "ABANDONED_CART_REMINDER",
              entityType: "CART",
              entityId: cart.id,
              metadata: {
                userId,
                cartId: cart.id,
                itemCount: cart.items.length,
                smsSent,
                emailSent,
              },
            },
          });
        }

        result.remindedCarts += 1;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[processAbandonedReminders] Error reminding cart for user ${cart.user.id}:`,
          err
        );
        result.errors.push({ targetId: cart.id, error: errorMsg });
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[processAbandonedReminders] Failed to scan candidate carts:", err);
    result.errors.push({ targetId: "SCAN_CARTS_FAIL", error: errorMsg });
  }

  return result;
}

/**
 * Manually dispatches an abandoned reminder for a specific order.
 * Can be triggered from admin order details page.
 */
export async function sendManualAbandonedOrderReminder(orderNumber: string): Promise<{
  success: boolean;
  smsSent: boolean;
  emailSent: boolean;
  error?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) {
    return { success: false, smsSent: false, emailSent: false, error: "Order not found" };
  }

  if (order.paymentStatus === "SUCCESS" || order.status === "CANCELLED") {
    return {
      success: false,
      smsSent: false,
      emailSent: false,
      error:
        order.paymentStatus === "SUCCESS"
          ? "Order is already paid. Recovery reminder not applicable."
          : "Order is cancelled. Recovery reminder not applicable.",
    };
  }

  const firstName = getCleanCustomerName(order.customerName);
  const nameGreeting = firstName ? `${firstName}` : "সম্মানিত গ্রাহক";
  const recoveryUrl = `${SITE_URL}/order-success/${order.orderNumber}`;

  let smsSent = false;
  let emailSent = false;

  const targetPhone = cleanPhone(order.customerPhone);
  if (targetPhone) {
    const smsBody = `আসসালামু আলাইকুম ${nameGreeting}! VibeLock-এ আপনার #${order.orderNumber} অর্ডারটি পেন্ডিং রয়েছে। স্টক শেষ হওয়ার আগেই অর্ডার সম্পন্ন করতে ভিজিট করুন: ${recoveryUrl} (হেল্পলাইন: 01311333277)`;
    smsSent = await sendSmsNotification({
      phone: targetPhone,
      message: smsBody,
      purpose: "abandoned_cart_recovery",
    });
  }

  if (order.customerEmail && order.customerEmail.includes("@")) {
    emailSent = await sendAbandonedCartEmail({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      orderNumber: order.orderNumber,
      recoveryUrl,
      items: order.items.map((it) => ({
        productName: it.productName,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
      })),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
    });
  }

  await prisma.orderHistory.create({
    data: {
      orderId: order.id,
      status: order.status,
      notes: `MANUAL_ABANDONED_REMINDER_SENT: SMS=${smsSent ? "OK" : "SKIP"}, Email=${emailSent ? "OK" : "SKIP"} at ${new Date().toISOString()}`,
    },
  });

  return { success: true, smsSent, emailSent };
}
