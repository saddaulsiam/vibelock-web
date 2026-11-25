import "server-only";

import { env } from "@/lib/config/env";
import { appConfig } from "@/lib/config/app";

export interface TelegramOrderItem {
  productName: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

export interface TelegramOrderNotificationPayload {
  orderId?: string | null;
  orderNumber: string;
  total: number | string;
  paymentMethod: string;
  paymentStatus?: "PAID" | "SUCCESS" | "PENDING" | "COD";
  gatewayTransactionId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  city?: string | null;
  itemCount: number;
  items?: TelegramOrderItem[];
}

/**
 * Escapes characters for Telegram HTML mode to avoid injection or parse errors.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Formats order notification as clean, structured Telegram HTML.
 */
export function formatTelegramOrderMessage(payload: TelegramOrderNotificationPayload): string {
  const customerName = escapeHtml(payload.customerName || "Customer");
  const phone = payload.customerPhone ? escapeHtml(payload.customerPhone) : "N/A";
  const city = payload.city ? escapeHtml(payload.city) : "Bangladesh";
  const method = escapeHtml(payload.paymentMethod);
  const status =
    payload.paymentStatus === "PAID" || payload.paymentStatus === "SUCCESS"
      ? "✅ PAID"
      : payload.paymentStatus === "COD"
        ? "💵 COD"
        : "⏳ PENDING";
  const totalAmount = Number(payload.total).toLocaleString("en-BD", { minimumFractionDigits: 2 });
  const targetId = payload.orderId || payload.orderNumber;
  const adminOrderUrl = `${appConfig.url}/admin/orders/${encodeURIComponent(targetId)}`;

  let itemsSummary = "";
  if (payload.items && payload.items.length > 0) {
    itemsSummary = payload.items
      .slice(0, 5)
      .map((item) => {
        const variant = [item.size, item.color].filter(Boolean).join(" / ");
        const variantText = variant ? ` (${escapeHtml(variant)})` : "";
        return `  • <b>${item.quantity}x</b> ${escapeHtml(item.productName)}${variantText}`;
      })
      .join("\n");
    if (payload.items.length > 5) {
      itemsSummary += `\n  <i>...and ${payload.items.length - 5} more item(s)</i>`;
    }
  }

  const lines = [
    `🚨 <b>NEW ORDER RECEIVED: #${escapeHtml(payload.orderNumber)}</b>`,
    ``,
    `💰 <b>Amount:</b> ৳ ${totalAmount}`,
    `💳 <b>Payment:</b> ${method} [${status}]`,
  ];

  if (payload.gatewayTransactionId) {
    lines.push(`🔑 <b>TrxID:</b> <code>${escapeHtml(payload.gatewayTransactionId)}</code>`);
  }

  lines.push(
    ``,
    `👤 <b>Customer:</b> ${customerName}`,
    `📞 <b>Phone:</b> <code>${phone}</code>`,
    `📍 <b>Destination:</b> ${city}`
  );

  if (itemsSummary) {
    lines.push(``, `📦 <b>Items (${payload.itemCount}):</b>`, itemsSummary);
  }

  lines.push(``, `🔗 <a href='${adminOrderUrl}'>Open in Admin Dashboard</a>`);

  return lines.join("\n");
}

/**
 * Sends a structured, non-blocking order alert to the VibeLock Admin Telegram channel/group.
 * Guarantees fail-open behavior: failures will never throw or crash checkout.
 */
export async function sendTelegramOrderNotification(
  payload: TelegramOrderNotificationPayload
): Promise<boolean> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    if (env.NODE_ENV !== "production") {
      console.log(
        `[Telegram Notification Simulated] #${payload.orderNumber} (৳${payload.total}) - Token/ChatID unconfigured`
      );
    }
    return false;
  }

  const message = formatTelegramOrderMessage(payload);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `[TelegramNotification] Failed with HTTP ${response.status} for order #${payload.orderNumber}:`,
        errText
      );
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(
        `[TelegramNotification] Request timed out (3.5s) for order #${payload.orderNumber}`
      );
    } else {
      console.error(
        `[TelegramNotification] Network or API error for order #${payload.orderNumber}:`,
        error
      );
    }
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
