import { checkOnlinePaymentFulfillmentEligibility } from "@/lib/payment/fulfillment";
import { CaptureReconciliationStatus } from "@/lib/payment/types";
import { describe, expect, it } from "vitest";

describe("Payment Fulfillment Eligibility (checkOnlinePaymentFulfillmentEligibility)", () => {
  describe("COD and Payment Method Boundary", () => {
    it("COD orders are always eligible for fulfillment advancement even if pending", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "COD",
        paymentStatus: "PENDING",
      });
      expect(result.eligible).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("non-ONLINE methods (e.g., POS_CASH) are eligible", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "POS_CASH",
        paymentStatus: "SUCCESS",
      });
      expect(result.eligible).toBe(true);
    });
  });

  describe("Online Orders: Payment Status & Missing Payment Records (Fix 2)", () => {
    it("fails closed when online order paymentStatus is not SUCCESS", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        payments: [{ status: "PENDING" }],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe("Online orders must be fully paid before fulfillment.");
    });

    it("fails closed when online order has missing/empty payment records (empty array)", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Online orders must have authoritative payment records before fulfillment."
      );
    });

    it("fails closed when online order has undefined payment records", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: undefined,
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Online orders must have authoritative payment records before fulfillment."
      );
    });

    it("fails closed when online order payments array has no confirmed SUCCESS payment", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [{ status: "INITIATED" }, { status: "FAILED" }],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Online orders must have a confirmed successful payment record before fulfillment."
      );
    });
  });

  describe("Empty Captures & Non-Capture Gateway Compatibility", () => {
    it("eligible when online payment is SUCCESS with empty captures (legacy / non-SSLCommerz flows)", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-bkash-01",
            status: "SUCCESS",
            captures: [],
          },
        ],
      });
      expect(result.eligible).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("eligible when online payment is SUCCESS with captures undefined", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-nagad-01",
            status: "SUCCESS",
          },
        ],
      });
      expect(result.eligible).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Settled Primary Capture, Risk Holds & Provisional Evidence", () => {
    it("eligible when online payment has a settled primary capture", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-clean-01",
            status: "SUCCESS",
            captures: [
              {
                isPrimary: true,
                reconciliationStatus: CaptureReconciliationStatus.SETTLED,
              },
            ],
          },
        ],
      });
      expect(result.eligible).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("blocks fulfillment when online payment has a risk-held primary capture (NEEDS_REVIEW)", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-risk-01",
            status: "SUCCESS",
            captures: [
              {
                isPrimary: true,
                reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW,
              },
            ],
          },
        ],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Cannot advance order status: online payment has unreconciled primary capture or risk hold."
      );
    });

    it("blocks fulfillment when captures are present but none is settled primary", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-excess-only-01",
            status: "SUCCESS",
            captures: [
              {
                isPrimary: false,
                reconciliationStatus: CaptureReconciliationStatus.SETTLED,
              },
            ],
          },
        ],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Cannot advance order status: online payment has unreconciled primary capture or risk hold."
      );
    });

    it("blocks fulfillment when an unresolved provisional hold exists in gatewayPayload", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-prov-01",
            status: "SUCCESS",
            gatewayPayload: {
              provisional: {
                "VAL-PROV-001": {
                  valId: "VAL-PROV-001",
                  reconciliationHold: true,
                },
              },
            },
            captures: [],
          },
        ],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
    });

    it("provisional hold blocks fulfillment even if settled captures are present", () => {
      const result = checkOnlinePaymentFulfillmentEligibility({
        paymentMethod: "ONLINE",
        paymentStatus: "SUCCESS",
        payments: [
          {
            id: "pay-prov-settled-01",
            status: "SUCCESS",
            gatewayPayload: {
              provisional: {
                "VAL-PROV-002": {
                  valId: "VAL-PROV-002",
                  reconciliationHold: true,
                },
              },
            },
            captures: [
              {
                isPrimary: true,
                reconciliationStatus: CaptureReconciliationStatus.SETTLED,
              },
            ],
          },
        ],
      });
      expect(result.eligible).toBe(false);
      expect(result.error).toBe(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
    });
  });
});
