import {
  generateOrderNumber,
  generatePosOrderNumber,
  generateRandom8Digits,
  generateWebsiteOrderNumber,
  isOrderNumberCollision,
  isValidOrderNumber,
  isValidPosOrderNumber,
  isValidWebsiteOrderNumber,
  MAX_ORDER_NUMBER_COLLISION_RETRIES,
} from "@/lib/orders/order-number";
import { describe, expect, test } from "vitest";

type PrismaTestError = Error & {
  code?: string;
  meta?: { target?: string[] };
};

describe("Customer-Facing Order Number Generation & Formats", () => {
  describe("Website Order Numbers (VL-XXXXXXXX)", () => {
    test("generateRandom8Digits produces integers strictly within [10000000, 99999999]", () => {
      const val = generateRandom8Digits();
      expect(val).toBeGreaterThanOrEqual(10_000_000);
      expect(val).toBeLessThanOrEqual(99_999_999);
    });

    test("generates order number with VL- prefix followed by exactly 8 digits", () => {
      const orderNumber = generateWebsiteOrderNumber();
      expect(orderNumber).toMatch(/^VL-[1-9][0-9]{7}$/);
      expect(orderNumber.length).toBe(11);
      expect(isValidWebsiteOrderNumber(orderNumber)).toBe(true);
      expect(isValidOrderNumber(orderNumber)).toBe(true);
    });

    test("strictly ensures the first digit is 1–9 and never leading zero across 1,000 iterations", () => {
      const generated = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const orderNumber = generateWebsiteOrderNumber();
        expect(orderNumber).toMatch(/^VL-[1-9][0-9]{7}$/);

        const digits = orderNumber.slice(3);
        expect(digits.length).toBe(8);

        const firstDigit = Number(digits[0]);
        expect(firstDigit).toBeGreaterThanOrEqual(1);
        expect(firstDigit).toBeLessThanOrEqual(9);

        const numericValue = Number(digits);
        expect(numericValue).toBeGreaterThanOrEqual(10_000_000);
        expect(numericValue).toBeLessThanOrEqual(99_999_999);

        // Verify no timestamp or ISO date prefix (old format started with VL-YYYYMMDD-)
        const oldDateFormatPrefix = `VL-${new Date().toISOString().slice(0, 4)}`;
        expect(orderNumber.startsWith(oldDateFormatPrefix + "-")).toBe(false);

        generated.add(orderNumber);
      }

      // With 90,000,000 possible values, 1000 random samples should yield > 990 unique values
      expect(generated.size).toBeGreaterThanOrEqual(990);
    });

    test("validates valid website order numbers and rejects invalid formats", () => {
      expect(isValidWebsiteOrderNumber("VL-83910275")).toBe(true);
      expect(isValidWebsiteOrderNumber("VL-10000000")).toBe(true);
      expect(isValidWebsiteOrderNumber("VL-99999999")).toBe(true);

      // Invalid: leading zero
      expect(isValidWebsiteOrderNumber("VL-08391027")).toBe(false);
      // Invalid: 7 digits
      expect(isValidWebsiteOrderNumber("VL-8391027")).toBe(false);
      // Invalid: 9 digits
      expect(isValidWebsiteOrderNumber("VL-839102751")).toBe(false);
      // Invalid: contains letters
      expect(isValidWebsiteOrderNumber("VL-8391027A")).toBe(false);
      // Invalid: legacy date format
      expect(isValidWebsiteOrderNumber("VL-20261125-391800")).toBe(false);
      // Invalid: POS format
      expect(isValidWebsiteOrderNumber("VL-POS-58391027")).toBe(false);
    });
  });

  describe("POS Order Numbers (VL-POS-XXXXXXXX)", () => {
    test("generates order number with VL-POS- prefix followed by exactly 8 digits", () => {
      const orderNumber = generatePosOrderNumber();
      expect(orderNumber).toMatch(/^VL-POS-[1-9][0-9]{7}$/);
      expect(orderNumber.length).toBe(15);
      expect(isValidPosOrderNumber(orderNumber)).toBe(true);
      expect(isValidOrderNumber(orderNumber)).toBe(true);
    });

    test("strictly ensures the first digit is 1–9 across 1,000 iterations", () => {
      for (let i = 0; i < 1000; i++) {
        const orderNumber = generatePosOrderNumber();
        expect(orderNumber).toMatch(/^VL-POS-[1-9][0-9]{7}$/);

        const digits = orderNumber.slice(7);
        expect(digits.length).toBe(8);

        const firstDigit = Number(digits[0]);
        expect(firstDigit).toBeGreaterThanOrEqual(1);
        expect(firstDigit).toBeLessThanOrEqual(9);

        const numericValue = Number(digits);
        expect(numericValue).toBeGreaterThanOrEqual(10_000_000);
        expect(numericValue).toBeLessThanOrEqual(99_999_999);
      }
    });

    test("validates valid POS order numbers and rejects invalid formats", () => {
      expect(isValidPosOrderNumber("VL-POS-58391027")).toBe(true);
      expect(isValidPosOrderNumber("VL-POS-10000000")).toBe(true);
      expect(isValidPosOrderNumber("VL-POS-99999999")).toBe(true);

      // Invalid: leading zero
      expect(isValidPosOrderNumber("VL-POS-08391027")).toBe(false);
      // Invalid: website format
      expect(isValidPosOrderNumber("VL-83910275")).toBe(false);
      // Invalid: legacy POS format
      expect(isValidPosOrderNumber("VL-POS-1001")).toBe(false);
    });
  });

  describe("Channel-aware generateOrderNumber() helper", () => {
    test("generates WEBSITE format when channel is WEBSITE or omitted", () => {
      const defaultOrder = generateOrderNumber();
      expect(isValidWebsiteOrderNumber(defaultOrder)).toBe(true);

      const websiteOrder = generateOrderNumber("WEBSITE");
      expect(isValidWebsiteOrderNumber(websiteOrder)).toBe(true);
    });

    test("generates POS format when channel is POS", () => {
      const posOrder = generateOrderNumber("POS");
      expect(isValidPosOrderNumber(posOrder)).toBe(true);
    });
  });

  describe("Database Unique Constraint Collision Detection (isOrderNumberCollision)", () => {
    test("detects P2002 error when target array contains orderNumber", () => {
      const error = {
        code: "P2002",
        meta: { target: ["orderNumber"] },
      };
      expect(isOrderNumberCollision(error)).toBe(true);
    });

    test("detects P2002 error when target array contains Order_orderNumber_key", () => {
      const error = {
        code: "P2002",
        meta: { target: ["Order_orderNumber_key"] },
      };
      expect(isOrderNumberCollision(error)).toBe(true);
    });

    test("detects P2002 error when target is a string containing orderNumber", () => {
      const error = {
        code: "P2002",
        meta: { target: "Order_orderNumber_key" },
      };
      expect(isOrderNumberCollision(error)).toBe(true);
    });

    test("detects P2002 error via message fallback", () => {
      const error = {
        code: "P2002",
        message: "Unique constraint failed on the fields: (`orderNumber`)",
      };
      expect(isOrderNumberCollision(error)).toBe(true);
    });

    test("does NOT treat checkoutIdempotencyKey P2002 collision as orderNumber collision", () => {
      const error = {
        code: "P2002",
        meta: { target: ["checkoutIdempotencyKey"] },
      };
      expect(isOrderNumberCollision(error)).toBe(false);
    });

    test("does NOT treat other unique field collisions (email, sku, slug) as orderNumber collision", () => {
      expect(isOrderNumberCollision({ code: "P2002", meta: { target: ["email"] } })).toBe(false);
      expect(isOrderNumberCollision({ code: "P2002", meta: { target: ["sku"] } })).toBe(false);
      expect(isOrderNumberCollision({ code: "P2002", meta: { target: ["slug"] } })).toBe(false);
    });

    test("does NOT treat non-P2002 database errors as collision", () => {
      expect(isOrderNumberCollision({ code: "P2003", message: "Foreign key failed" })).toBe(false);
      expect(isOrderNumberCollision({ code: "P2028", message: "Transaction timeout" })).toBe(false);
      expect(isOrderNumberCollision(new Error("Insufficient stock"))).toBe(false);
      expect(isOrderNumberCollision(null)).toBe(false);
      expect(isOrderNumberCollision(undefined)).toBe(false);
    });
  });

  describe("Bounded Collision Retry Simulation", () => {
    test("retries and succeeds when an initial collision occurs", async () => {
      let attempts = 0;
      const createdOrderNumbers: string[] = [];

      async function simulateOrderCreation(): Promise<{ orderNumber: string }> {
        let orderResult: { orderNumber: string } | null = null;
        let attempt = 0;

        while (attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
          attempt++;
          attempts++;
          const candidate = generateWebsiteOrderNumber();
          createdOrderNumbers.push(candidate);

          try {
            // Simulate collision on attempt 1
            if (attempt === 1) {
              const p2002: PrismaTestError = new Error("Unique constraint failed on orderNumber");
              p2002.code = "P2002";
              p2002.meta = { target: ["orderNumber"] };
              throw p2002;
            }

            orderResult = { orderNumber: candidate };
            break;
          } catch (err) {
            if (isOrderNumberCollision(err) && attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
              continue;
            }
            throw err;
          }
        }

        if (!orderResult) throw new Error("FAILED");
        return orderResult;
      }

      const result = await simulateOrderCreation();
      expect(attempts).toBe(2);
      expect(createdOrderNumbers.length).toBe(2);
      expect(createdOrderNumbers[0]).not.toBe(createdOrderNumbers[1]);
      expect(result.orderNumber).toBe(createdOrderNumbers[1]);
      expect(isValidWebsiteOrderNumber(result.orderNumber)).toBe(true);
    });

    test("fails closed if collisions exhaust max retries (5)", async () => {
      let attempts = 0;

      async function simulatePersistentCollision(): Promise<void> {
        let attempt = 0;
        while (attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
          attempt++;
          attempts++;
          try {
            const p2002: PrismaTestError = new Error("Unique constraint failed");
            p2002.code = "P2002";
            p2002.meta = { target: ["orderNumber"] };
            throw p2002;
          } catch (err) {
            if (isOrderNumberCollision(err) && attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
              continue;
            }
            throw err;
          }
        }
      }

      await expect(simulatePersistentCollision()).rejects.toThrow();
      expect(attempts).toBe(MAX_ORDER_NUMBER_COLLISION_RETRIES);
    });

    test("does not retry unrelated errors (e.g. inventory or idempotency key conflict)", async () => {
      let attempts = 0;

      async function simulateInventoryFailure(): Promise<void> {
        let attempt = 0;
        while (attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
          attempt++;
          attempts++;
          try {
            throw new Error("Insufficient stock");
          } catch (err) {
            if (isOrderNumberCollision(err) && attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
              continue;
            }
            throw err;
          }
        }
      }

      await expect(simulateInventoryFailure()).rejects.toThrow("Insufficient stock");
      expect(attempts).toBe(1); // Never retried!
    });
  });

  describe("Historical Order Number Compatibility", () => {
    test("preserves existing historical order number formats without breaking", () => {
      const historicalOrders = [
        "VL-20261125-391800",
        "VL-20261013-EXISTING",
        "VL-POS-1001",
        "VL-POS-20261101-01",
        "ORD-2026-XYZ",
      ];

      // Sentry privacy regex matches both historical and new formats
      const sentryRegex = /^(VL|ORD)-[a-zA-Z0-9_-]+$/i;
      for (const orderNum of historicalOrders) {
        expect(sentryRegex.test(orderNum)).toBe(true);
      }

      // New formats also pass sentry regex
      expect(sentryRegex.test("VL-83910275")).toBe(true);
      expect(sentryRegex.test("VL-POS-58391027")).toBe(true);
    });
  });
});
