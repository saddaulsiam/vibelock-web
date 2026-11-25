import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatTelegramOrderMessage,
  sendTelegramOrderNotification,
  type TelegramOrderNotificationPayload,
} from "@/lib/notifications/telegram";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    TELEGRAM_BOT_TOKEN: "mock_bot_token_123",
    TELEGRAM_CHAT_ID: "-100123456789",
  },
}));

vi.mock("@/lib/config/app", () => ({
  appConfig: {
    url: "https://vibelock.bd",
  },
}));

describe("Telegram Order Notifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatTelegramOrderMessage", () => {
    it("formats a standard COD order with sanitized HTML", () => {
      const payload: TelegramOrderNotificationPayload = {
        orderNumber: "VL-20261125-ABCD12",
        total: 1250,
        paymentMethod: "COD",
        paymentStatus: "COD",
        customerName: "Siam <Tester> & Co.",
        customerPhone: "+8801311333277",
        city: "Dhaka",
        itemCount: 1,
        items: [
          {
            productName: "Heavyweight Graphic Tee <Limited>",
            quantity: 1,
            size: "XL",
            color: "Charcoal Black",
          },
        ],
      };

      const message = formatTelegramOrderMessage(payload);

      expect(message).toContain("🚨 <b>NEW ORDER RECEIVED: #VL-20261125-ABCD12</b>");
      expect(message).toContain("💰 <b>Amount:</b> ৳ 1,250.00");
      expect(message).toContain("💳 <b>Payment:</b> COD [💵 COD]");
      expect(message).toContain("👤 <b>Customer:</b> Siam &lt;Tester&gt; &amp; Co.");
      expect(message).toContain("📞 <b>Phone:</b> <code>+8801311333277</code>");
      expect(message).toContain("📍 <b>Destination:</b> Dhaka");
      expect(message).toContain("• <b>1x</b> Heavyweight Graphic Tee &lt;Limited&gt; (XL / Charcoal Black)");
      expect(message).toContain("href='https://vibelock.bd/admin/orders/VL-20261125-ABCD12'");
    });

    it("formats a verified online payment order with TrxID", () => {
      const payload: TelegramOrderNotificationPayload = {
        orderNumber: "VL-20261125-PAID99",
        total: "3500",
        paymentMethod: "PAYSTATION",
        paymentStatus: "PAID",
        gatewayTransactionId: "TRX_BKASH_998877",
        customerName: "Rahim Uddin",
        customerPhone: "+8801700000000",
        city: "Chittagong",
        itemCount: 2,
        items: [
          { productName: "Cargo Pants", quantity: 2, size: "32" },
        ],
      };

      const message = formatTelegramOrderMessage(payload);

      expect(message).toContain("💳 <b>Payment:</b> PAYSTATION [✅ PAID]");
      expect(message).toContain("🔑 <b>TrxID:</b> <code>TRX_BKASH_998877</code>");
    });

    it("truncates item list gracefully when more than 5 items are present", () => {
      const payload: TelegramOrderNotificationPayload = {
        orderNumber: "VL-BULK-001",
        total: 10000,
        paymentMethod: "COD",
        itemCount: 7,
        items: [
          { productName: "Item 1", quantity: 1 },
          { productName: "Item 2", quantity: 1 },
          { productName: "Item 3", quantity: 1 },
          { productName: "Item 4", quantity: 1 },
          { productName: "Item 5", quantity: 1 },
          { productName: "Item 6", quantity: 1 },
          { productName: "Item 7", quantity: 1 },
        ],
      };

      const message = formatTelegramOrderMessage(payload);

      expect(message).toContain("Item 1");
      expect(message).toContain("Item 5");
      expect(message).not.toContain("Item 6");
      expect(message).toContain("<i>...and 2 more item(s)</i>");
    });
  });

  describe("sendTelegramOrderNotification", () => {
    it("successfully sends message via Telegram Bot API", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 42 } }),
      });
      global.fetch = fetchMock;

      const result = await sendTelegramOrderNotification({
        orderNumber: "VL-TEST-123",
        total: 500,
        paymentMethod: "COD",
        itemCount: 1,
      });

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.telegram.org/botmock_bot_token_123/sendMessage");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body as string);
      expect(body.chat_id).toBe("-100123456789");
      expect(body.parse_mode).toBe("HTML");
    });

    it("fails open and returns false without throwing on HTTP error", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request: chat not found",
      });
      global.fetch = fetchMock;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendTelegramOrderNotification({
        orderNumber: "VL-TEST-FAIL",
        total: 500,
        paymentMethod: "COD",
        itemCount: 1,
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("fails open and returns false on network timeout or exception", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("Network connection dropped"));
      global.fetch = fetchMock;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await sendTelegramOrderNotification({
        orderNumber: "VL-TEST-TIMEOUT",
        total: 500,
        paymentMethod: "COD",
        itemCount: 1,
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
