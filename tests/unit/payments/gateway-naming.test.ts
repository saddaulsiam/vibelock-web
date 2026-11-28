import { formatPaymentGatewayLabel } from "@/components/shared/payment-gateway-badge";
import { mapOrderDetail, mapOrderSummary } from "@/lib/orders/mappers";
import {
  extractCardMetadata,
  formatSslcommerzChannel,
  getHumanGatewayName,
} from "@/lib/payment/format";
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("formatSslcommerzChannel", () => {
  describe("Card brand priority", () => {
    it("prioritizes card_brand for Visa network even if card_type has bank info", () => {
      expect(formatSslcommerzChannel("VISA-Dutch Bangla Bank Limited", "VISA")).toBe("Visa");
      expect(formatSslcommerzChannel("UNKNOWN-BANK", "VISA")).toBe("Visa");
      expect(formatSslcommerzChannel(null, "VISA")).toBe("Visa");
      expect(formatSslcommerzChannel("", "visa")).toBe("Visa");
    });

    it("prioritizes card_brand for Mastercard network", () => {
      expect(formatSslcommerzChannel("MASTER-City Bank", "MASTER")).toBe("Mastercard");
      expect(formatSslcommerzChannel("MASTERCARD-EBL", "MASTERCARD")).toBe("Mastercard");
      expect(formatSslcommerzChannel(null, "mastercard")).toBe("Mastercard");
      expect(formatSslcommerzChannel(undefined, "master")).toBe("Mastercard");
    });

    it("prioritizes card_brand for American Express network", () => {
      expect(formatSslcommerzChannel("AMEX-City Bank", "AMEX")).toBe("American Express");
      expect(formatSslcommerzChannel(null, "AMERICAN EXPRESS")).toBe("American Express");
      expect(formatSslcommerzChannel(null, "AMERICAN_EXPRESS")).toBe("American Express");
      expect(formatSslcommerzChannel(undefined, "amex")).toBe("American Express");
    });
  });

  describe("Generic card_brand handling (MOBILEBANKING)", () => {
    it("resolves MFS from card_type when card_brand is generic MOBILEBANKING", () => {
      expect(formatSslcommerzChannel("NAGAD-Nagad", "MOBILEBANKING")).toBe("Nagad");
      expect(formatSslcommerzChannel("BKASH-bKash", "MOBILEBANKING")).toBe("bKash");
      expect(formatSslcommerzChannel("UPAY-UCB", "MOBILEBANKING")).toBe("Upay");
      expect(formatSslcommerzChannel("nagad", "MOBILEBANKING")).toBe("Nagad");
      expect(formatSslcommerzChannel("bkash", "mobilebanking")).toBe("bKash");
      expect(formatSslcommerzChannel("upay", "MOBILEBANKING")).toBe("Upay");
    });
  });

  describe("MFS channel resolution from card_type", () => {
    it("formats Nagad variations accurately", () => {
      expect(formatSslcommerzChannel("NAGAD-Nagad")).toBe("Nagad");
      expect(formatSslcommerzChannel("NAGAD")).toBe("Nagad");
      expect(formatSslcommerzChannel("nagad")).toBe("Nagad");
      expect(formatSslcommerzChannel("nagad-nagad")).toBe("Nagad");
      expect(formatSslcommerzChannel("NAGAD-DBBL")).toBe("Nagad");
    });

    it("formats bKash variations accurately", () => {
      expect(formatSslcommerzChannel("BKASH-bKash")).toBe("bKash");
      expect(formatSslcommerzChannel("BKASH")).toBe("bKash");
      expect(formatSslcommerzChannel("bkash")).toBe("bKash");
      expect(formatSslcommerzChannel("bkash-bkash")).toBe("bKash");
      expect(formatSslcommerzChannel("BKASH-VISA")).toBe("bKash");
    });

    it("formats Upay variations accurately", () => {
      expect(formatSslcommerzChannel("UPAY")).toBe("Upay");
      expect(formatSslcommerzChannel("UPAY-UCB")).toBe("Upay");
      expect(formatSslcommerzChannel("upay")).toBe("Upay");
      expect(formatSslcommerzChannel("upay-ucb")).toBe("Upay");
    });
  });

  describe("Card network fallback resolution from card_type", () => {
    it("formats Visa from card_type when card_brand is absent", () => {
      expect(formatSslcommerzChannel("VISA")).toBe("Visa");
      expect(formatSslcommerzChannel("VISA-Dutch Bangla Bank Limited")).toBe("Visa");
      expect(formatSslcommerzChannel("visa")).toBe("Visa");
      expect(formatSslcommerzChannel("VISA-DBBL")).toBe("Visa");
      expect(formatSslcommerzChannel("visa-citybank")).toBe("Visa");
    });

    it("formats Mastercard from card_type when card_brand is absent", () => {
      expect(formatSslcommerzChannel("MASTER")).toBe("Mastercard");
      expect(formatSslcommerzChannel("MASTERCARD")).toBe("Mastercard");
      expect(formatSslcommerzChannel("MASTER-City Bank")).toBe("Mastercard");
      expect(formatSslcommerzChannel("mastercard-ebl")).toBe("Mastercard");
      expect(formatSslcommerzChannel("master")).toBe("Mastercard");
      expect(formatSslcommerzChannel("MASTERCARD-Brac Bank")).toBe("Mastercard");
    });

    it("formats American Express from card_type when card_brand is absent", () => {
      expect(formatSslcommerzChannel("AMEX")).toBe("American Express");
      expect(formatSslcommerzChannel("AMERICAN EXPRESS")).toBe("American Express");
      expect(formatSslcommerzChannel("AMERICAN_EXPRESS")).toBe("American Express");
      expect(formatSslcommerzChannel("amex")).toBe("American Express");
      expect(formatSslcommerzChannel("AMEX-City Bank")).toBe("American Express");
    });
  });

  describe("Fallback behavior", () => {
    it("falls back to SSLCOMMERZ for empty, whitespace, null, or undefined", () => {
      expect(formatSslcommerzChannel(null, null)).toBe("SSLCOMMERZ");
      expect(formatSslcommerzChannel(undefined, undefined)).toBe("SSLCOMMERZ");
      expect(formatSslcommerzChannel("", "")).toBe("SSLCOMMERZ");
      expect(formatSslcommerzChannel("   ", "   ")).toBe("SSLCOMMERZ");
    });

    it("falls back to SSLCOMMERZ for unknown channel types without guessing", () => {
      expect(formatSslcommerzChannel("UNKNOWN_XYZ", "UNKNOWN")).toBe("SSLCOMMERZ");
      expect(formatSslcommerzChannel("DISCOVER")).toBe("SSLCOMMERZ");
      expect(formatSslcommerzChannel("CRYPTO")).toBe("SSLCOMMERZ");
    });
  });
});

describe("getHumanGatewayName", () => {
  it("derives channel name for SSLCOMMERZ when cardType or cardBrand is provided", () => {
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "NAGAD-Nagad")).toBe("Nagad");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "BKASH-bKash")).toBe("bKash");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "VISA-DBBL")).toBe("Visa");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", null, "VISA")).toBe("Visa");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "MASTER-City Bank")).toBe("Mastercard");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", null, "MASTERCARD")).toBe("Mastercard");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "AMEX")).toBe("American Express");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", null, "AMEX")).toBe("American Express");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "UPAY")).toBe("Upay");
  });

  it("unknown or missing channel MUST display exactly 'SSLCOMMERZ (Cards / MFS)'", () => {
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", null)).toBe("SSLCOMMERZ (Cards / MFS)");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", undefined)).toBe("SSLCOMMERZ (Cards / MFS)");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "")).toBe("SSLCOMMERZ (Cards / MFS)");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE", "UNKNOWN_METHOD")).toBe(
      "SSLCOMMERZ (Cards / MFS)"
    );
    expect(getHumanGatewayName("ONLINE", "ONLINE", null)).toBe("SSLCOMMERZ (Cards / MFS)");
    expect(getHumanGatewayName("SSLCOMMERZ", "ONLINE")).toBe("SSLCOMMERZ (Cards / MFS)");
    expect(getHumanGatewayName("ONLINE", "ONLINE")).toBe("SSLCOMMERZ (Cards / MFS)");
  });

  it("preserves standard gateways without disruption", () => {
    expect(getHumanGatewayName("COD", "COD")).toBe("Cash on Delivery");
    expect(getHumanGatewayName("CASH", "CASH")).toBe("Cash on Delivery");
    expect(getHumanGatewayName(null, "COD")).toBe("Cash on Delivery");
    expect(getHumanGatewayName("BKASH", "ONLINE")).toBe("bKash");
    expect(getHumanGatewayName("NAGAD", "ONLINE")).toBe("Nagad");
    expect(getHumanGatewayName("BANGLA_QR", "ONLINE")).toBe("Bangla QR");
    expect(getHumanGatewayName("CARD", "ONLINE")).toBe("Credit / Debit Card");
  });
});

describe("extractCardMetadata", () => {
  it("extracts from PR #103 namespaced callback metadata", () => {
    const payload = {
      initiation: { sessionKey: "sess_123" },
      callback: {
        card_type: "NAGAD-Nagad",
        card_brand: "MOBILEBANKING",
        status: "VALID",
      },
    };
    const result = extractCardMetadata(payload);
    expect(result.cardType).toBe("NAGAD-Nagad");
    expect(result.cardBrand).toBe("MOBILEBANKING");
  });

  it("prefers namespaced callback metadata over root level metadata", () => {
    const payload = {
      card_type: "ROOT-CARD-TYPE",
      card_brand: "ROOT-BRAND",
      callback: {
        card_type: "BKASH-bKash",
        card_brand: "MOBILEBANKING",
      },
    };
    const result = extractCardMetadata(payload);
    expect(result.cardType).toBe("BKASH-bKash");
    expect(result.cardBrand).toBe("MOBILEBANKING");
  });

  it("falls back to legacy root-level metadata when callback namespace is absent", () => {
    const payload = {
      card_type: "VISA-DBBL",
      card_brand: "VISA",
      status: "VALID",
    };
    const result = extractCardMetadata(payload);
    expect(result.cardType).toBe("VISA-DBBL");
    expect(result.cardBrand).toBe("VISA");
  });

  it("safely handles null, undefined, empty objects, and primitive inputs", () => {
    expect(extractCardMetadata(null)).toEqual({ cardType: null, cardBrand: null });
    expect(extractCardMetadata(undefined)).toEqual({ cardType: null, cardBrand: null });
    expect(extractCardMetadata({})).toEqual({ cardType: null, cardBrand: null });
    expect(extractCardMetadata("string")).toEqual({ cardType: null, cardBrand: null });
    expect(extractCardMetadata(123)).toEqual({ cardType: null, cardBrand: null });
    expect(extractCardMetadata([])).toEqual({ cardType: null, cardBrand: null });
  });

  it("safely handles non-string or whitespace-only values in payload", () => {
    const payload = {
      callback: {
        card_type: 12345,
        card_brand: "   ",
      },
    };
    const result = extractCardMetadata(payload);
    expect(result.cardType).toBeNull();
    expect(result.cardBrand).toBeNull();
  });
});

describe("formatPaymentGatewayLabel (Badge Helper)", () => {
  it("formats SSLCOMMERZ with Nagad channel", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "NAGAD-Nagad");
    expect(badge.label).toBe("Nagad");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("PHONE");
  });

  it("formats SSLCOMMERZ with bKash channel", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "BKASH-bKash");
    expect(badge.label).toBe("bKash");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("PHONE");
  });

  it("formats SSLCOMMERZ with Upay channel", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "UPAY-UCB");
    expect(badge.label).toBe("Upay");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("PHONE");
  });

  it("formats SSLCOMMERZ with Visa channel (brand priority)", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "UNKNOWN-BANK", "VISA");
    expect(badge.label).toBe("Visa");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("CARD");
  });

  it("formats SSLCOMMERZ with Mastercard channel", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "MASTER-City Bank");
    expect(badge.label).toBe("Mastercard");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("CARD");
  });

  it("formats SSLCOMMERZ with American Express channel", () => {
    const badge = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "AMEX-City Bank");
    expect(badge.label).toBe("American Express");
    expect(badge.sublabel).toBe("via SSLCOMMERZ");
    expect(badge.icon).toBe("CARD");
  });

  it("falls back to generic SSLCOMMERZ with sublabel Cards / MFS when channel is empty or unknown", () => {
    const fallbackNull = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", null);
    expect(fallbackNull.label).toBe("SSLCOMMERZ");
    expect(fallbackNull.sublabel).toBe("Cards / MFS");
    expect(fallbackNull.icon).toBe("CARD");

    const fallbackUnknown = formatPaymentGatewayLabel("SSLCOMMERZ", "ONLINE", "UNKNOWN_CHANNEL");
    expect(fallbackUnknown.label).toBe("SSLCOMMERZ");
    expect(fallbackUnknown.sublabel).toBe("Cards / MFS");
  });

  it("preserves standard gateways", () => {
    expect(formatPaymentGatewayLabel("BKASH").label).toBe("bKash");
    expect(formatPaymentGatewayLabel("NAGAD").label).toBe("Nagad");
    expect(formatPaymentGatewayLabel("COD").label).toBe("COD");
    expect(formatPaymentGatewayLabel("COD").sublabel).toBe("Cash on Delivery");
  });
});

describe("Order Mappers card metadata extraction", () => {
  const dummyOrder: Order = {
    id: "ord_1",
    orderNumber: "VL-20261119-TEST01",
    userId: "usr_1",
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.SUCCESS,
    paymentMethod: PaymentMethod.ONLINE,
    subtotal: 1000 as unknown as import("@prisma/client/runtime/library").Decimal,
    shippingCost: 50 as unknown as import("@prisma/client/runtime/library").Decimal,
    taxRate: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    taxIncluded: false,
    taxAmount: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    discount: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    total: 1050 as unknown as import("@prisma/client/runtime/library").Decimal,
    salesChannel: SalesChannel.WEBSITE,
    checkoutIdempotencyKey: null,
    customerName: "Test Customer",
    customerEmail: "customer@example.com",
    customerPhone: "01700000000",
    shippingStreet: "123 Test St",
    shippingCity: "Dhaka",
    shippingState: null,
    shippingZip: null,
    shippingCountry: "Bangladesh",
    shippingMethodName: "Standard",
    shippingMethodId: "sm_1",
    deliveryNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    loyaltyPointsEarned: 0,
    loyaltyPointsRedeemed: 0,
  };

  const dummyItem = {
    id: "item_1",
    orderId: "ord_1",
    productName: "Test Hoodie",
    sku: "VL-HD-01",
    size: "L",
    color: "Black",
    unitPrice: 1000 as unknown as import("@prisma/client/runtime/library").Decimal,
    costPrice: 500 as unknown as import("@prisma/client/runtime/library").Decimal,
    appliedDiscount: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    taxRate: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    taxIncluded: false,
    lineSubtotal: 1000 as unknown as import("@prisma/client/runtime/library").Decimal,
    discountAmount: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    taxAmount: 0 as unknown as import("@prisma/client/runtime/library").Decimal,
    quantity: 1,
    lineTotal: 1000 as unknown as import("@prisma/client/runtime/library").Decimal,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrderItem;

  it("mapOrderSummary extracts cardType and cardBrand from namespaced gatewayPayload", () => {
    const orderWithPayload = {
      ...dummyOrder,
      items: [dummyItem],
      payments: [
        {
          id: "pay_1",
          orderId: "ord_1",
          gateway: "SSLCOMMERZ",
          status: PaymentStatus.SUCCESS,
          createdAt: new Date(),
          gatewayPayload: {
            initiation: { sessionKey: "sess_xyz" },
            callback: {
              card_type: "NAGAD-Nagad",
              card_brand: "MOBILEBANKING",
              tran_id: "SSLC-12345",
            },
          },
        },
      ],
    };

    const summary = mapOrderSummary(orderWithPayload);
    expect(summary.paymentGateway).toBe("SSLCOMMERZ");
    expect(summary.cardType).toBe("NAGAD-Nagad");
    expect(summary.cardBrand).toBe("MOBILEBANKING");
  });

  it("mapOrderDetail extracts cardType and cardBrand from legacy gatewayPayload", () => {
    const orderWithPayload = {
      ...dummyOrder,
      items: [dummyItem],
      payments: [
        {
          id: "pay_1",
          orderId: "ord_1",
          amount: 1050 as unknown as import("@prisma/client/runtime/library").Decimal,
          currency: "BDT",
          gateway: "SSLCOMMERZ",
          status: PaymentStatus.SUCCESS,
          createdAt: new Date(),
          updatedAt: new Date(),
          gatewayTransactionId: "TRX123",
          gatewayPayload: {
            card_type: "BKASH-bKash",
            card_brand: "MOBILEBANKING",
          },
          refunds: [],
        },
      ],
    };

    const detail = mapOrderDetail(orderWithPayload);
    expect(detail.paymentGateway).toBe("SSLCOMMERZ");
    expect(detail.cardType).toBe("BKASH-bKash");
    expect(detail.cardBrand).toBe("MOBILEBANKING");
  });

  it("handles null or missing gatewayPayload safely", () => {
    const orderWithoutPayload = {
      ...dummyOrder,
      items: [dummyItem],
      payments: [
        {
          id: "pay_1",
          orderId: "ord_1",
          gateway: "SSLCOMMERZ",
          status: PaymentStatus.SUCCESS,
          createdAt: new Date(),
          gatewayPayload: null,
        },
      ],
    };

    const summary = mapOrderSummary(orderWithoutPayload);
    expect(summary.paymentGateway).toBe("SSLCOMMERZ");
    expect(summary.cardType).toBeNull();
    expect(summary.cardBrand).toBeNull();

    const detail = mapOrderDetail(orderWithoutPayload);
    expect(detail.paymentGateway).toBe("SSLCOMMERZ");
    expect(detail.cardType).toBeNull();
    expect(detail.cardBrand).toBeNull();
  });
});
