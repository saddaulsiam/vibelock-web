import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectImageMimeFromBuffer,
  containsSvgOrScriptPayload,
  validateImageFile,
  AVATAR_ALLOWED_IMAGE_MIMES,
} from "@/lib/media/validation";
import { maskPhoneNumber } from "@/lib/sms/client";

// Mocks for database and authorization
const {
  mockPrismaUserFindUnique,
  mockPrismaOrderCount,
  mockPrismaOrderFindUnique,
  mockPrismaOrderFindFirst,
  mockPrismaAddressFindMany,
  mockPrismaAddressDeleteMany,
  mockPrismaCartDeleteMany,
  mockPrismaSessionDeleteMany,
  mockPrismaAuditLogCreate,
  mockPrismaUserDelete,
  mockPrismaReturnRequestCount,
  mockPrismaRefundCount,
  mockPrismaQueryRaw,
  mockPrismaTransaction,
  mockRequireUser,
  mockCheckRateLimit,
  mockCompare,
  mockAuth,
} = vi.hoisted(() => ({
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaOrderCount: vi.fn(),
  mockPrismaOrderFindUnique: vi.fn(),
  mockPrismaOrderFindFirst: vi.fn(),
  mockPrismaAddressFindMany: vi.fn(),
  mockPrismaAddressDeleteMany: vi.fn(),
  mockPrismaCartDeleteMany: vi.fn(),
  mockPrismaSessionDeleteMany: vi.fn(),
  mockPrismaAuditLogCreate: vi.fn(),
  mockPrismaUserDelete: vi.fn(),
  mockPrismaReturnRequestCount: vi.fn(),
  mockPrismaRefundCount: vi.fn(),
  mockPrismaQueryRaw: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockRequireUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCompare: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    $queryRaw: (...args: unknown[]) => mockPrismaQueryRaw(...args),
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
      delete: (...args: unknown[]) => mockPrismaUserDelete(...args),
    },
    order: {
      count: (...args: unknown[]) => mockPrismaOrderCount(...args),
      findUnique: (...args: unknown[]) => mockPrismaOrderFindUnique(...args),
      findFirst: (...args: unknown[]) => mockPrismaOrderFindFirst(...args),
    },
    returnRequest: {
      count: (...args: unknown[]) => mockPrismaReturnRequestCount(...args),
    },
    refund: {
      count: (...args: unknown[]) => mockPrismaRefundCount(...args),
    },
    address: {
      findMany: (...args: unknown[]) => mockPrismaAddressFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPrismaAddressDeleteMany(...args),
    },
    cart: {
      deleteMany: (...args: unknown[]) => mockPrismaCartDeleteMany(...args),
    },
    session: {
      deleteMany: (...args: unknown[]) => mockPrismaSessionDeleteMany(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockPrismaAuditLogCreate(...args),
    },
    verificationToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "token-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: (fnOrArray: unknown) => {
      if (typeof fnOrArray === "function") {
        return (fnOrArray as (tx: unknown) => unknown)({
          $queryRaw: (...args: unknown[]) => mockPrismaQueryRaw(...args),
          order: {
            count: (...args: unknown[]) => mockPrismaOrderCount(...args),
          },
          returnRequest: {
            count: (...args: unknown[]) => mockPrismaReturnRequestCount(...args),
          },
          refund: {
            count: (...args: unknown[]) => mockPrismaRefundCount(...args),
          },
          cart: { deleteMany: mockPrismaCartDeleteMany },
          session: { deleteMany: mockPrismaSessionDeleteMany },
          auditLog: { create: mockPrismaAuditLogCreate },
          user: { delete: mockPrismaUserDelete },
        });
      }
      return mockPrismaTransaction(fnOrArray);
    },
  },
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("bcryptjs", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

describe("Phase 9: Data Protection & Privacy Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Image Validation & Magic Byte Security (SEC-9-04)
  // =========================================================================
  describe("1. Image Validation & Magic Byte Signatures (SEC-9-04)", () => {
    // Helper to create File objects
    function createMockFile(name: string, type: string, buffer: Uint8Array): File {
      return new File([buffer as unknown as BlobPart], name, { type });
    }

    it("correctly identifies valid JPEG magic bytes (FF D8 FF)", () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectImageMimeFromBuffer(jpegBytes)).toBe("image/jpeg");
    });

    it("correctly identifies valid PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)", () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(detectImageMimeFromBuffer(pngBytes)).toBe("image/png");
    });

    it("correctly identifies valid WebP magic bytes (RIFF....WEBP)", () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      expect(detectImageMimeFromBuffer(webpBytes)).toBe("image/webp");
    });

    it("correctly identifies valid GIF magic bytes (GIF87a / GIF89a)", () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
      expect(detectImageMimeFromBuffer(gifBytes)).toBe("image/gif");
    });

    it("returns null for non-image or unknown binary buffers", () => {
      const textBytes = new TextEncoder().encode("Hello world! Not an image.");
      expect(detectImageMimeFromBuffer(textBytes)).toBeNull();
    });

    it("detects and flags SVG or script payloads in buffer", () => {
      const svgBuffer = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
      expect(containsSvgOrScriptPayload(svgBuffer)).toBe(true);

      const htmlBuffer = new TextEncoder().encode("<!DOCTYPE html><html><body><script>malicious()</script></body></html>");
      expect(containsSvgOrScriptPayload(htmlBuffer)).toBe(true);

      const safeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      expect(containsSvgOrScriptPayload(safeJpeg)).toBe(false);
    });

    it("strictly rejects SVG files by extension and MIME type", async () => {
      const svgContent = new TextEncoder().encode("<svg><circle r='10'/></svg>");
      const file = createMockFile("avatar.svg", "image/svg+xml", svgContent);

      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/SVG/i);
    });

    it("rejects MIME spoofing (file claims image/jpeg but has HTML/plain text bytes)", async () => {
      const spoofedBytes = new TextEncoder().encode("<h1>Fake Image</h1>");
      const file = createMockFile("photo.jpg", "image/jpeg", spoofedBytes);

      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Binary signature did not match/i);
    });

    it("rejects MIME mismatch (file claims image/png but has JPEG magic bytes)", async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00]);
      const file = createMockFile("avatar.png", "image/png", jpegBytes);

      const result = await validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/File signature mismatch/i);
    });

    it("rejects oversized images exceeding size limit", async () => {
      const largeBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
      largeBuffer[0] = 0xff;
      largeBuffer[1] = 0xd8;
      largeBuffer[2] = 0xff;
      const file = createMockFile("huge.jpg", "image/jpeg", largeBuffer);

      const result = await validateImageFile(file, { maxSizeBytes: 5 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must not exceed 5MB/i);
    });

    it("successfully validates genuine JPEG image", async () => {
      const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const file = createMockFile("profile.jpg", "image/jpeg", validJpeg);

      const result = await validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("image/jpeg");
    });

    it("successfully validates genuine PNG image", async () => {
      const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const file = createMockFile("profile.png", "image/png", validPng);

      const result = await validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("image/png");
    });

    it("restricts avatar uploads to JPG, PNG, and WebP (rejects GIF for avatars)", async () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
      const file = createMockFile("avatar.gif", "image/gif", gifBytes);

      const result = await validateImageFile(file, { allowedMimes: AVATAR_ALLOWED_IMAGE_MIMES });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Unsupported image format/i);
    });

    it("uploadAvatarAction rejects SVG files before any Base64 encoding", async () => {
      const { uploadAvatarAction } = await import("@/lib/account/actions");
      mockRequireUser.mockResolvedValue({ id: "user-avatar-test" });

      const svgContent = new TextEncoder().encode("<svg><circle r='10'/></svg>");
      const file = createMockFile("avatar.svg", "image/svg+xml", svgContent);
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAvatarAction(formData);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/SVG/i);
    });

    it("uploadAvatarAction converts verified JPG file to Base64 in local fallback", async () => {
      const { uploadAvatarAction } = await import("@/lib/account/actions");
      mockRequireUser.mockResolvedValue({ id: "user-avatar-test" });

      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const file = createMockFile("avatar.jpg", "image/jpeg", jpegBytes);
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAvatarAction(formData);
      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  // =========================================================================
  // 2. Sensitive Logging & OTP Redaction (SEC-9-03)
  // =========================================================================
  describe("2. Sensitive Logging & OTP Redaction (SEC-9-03)", () => {
    it("masks phone numbers correctly protecting customer privacy", () => {
      expect(maskPhoneNumber("+8801712345678")).toBe("+8801****678");
      expect(maskPhoneNumber("01712345678")).toBe("01712****678");
      expect(maskPhoneNumber("1234")).toBe("****");
      expect(maskPhoneNumber("12345678")).toBe("12****78");
    });

    it("maskPhoneNumber safely returns '****' for null, undefined, whitespace, and unexpected runtime inputs", () => {
      expect(maskPhoneNumber(null)).toBe("****");
      expect(maskPhoneNumber(undefined)).toBe("****");
      expect(maskPhoneNumber("")).toBe("****");
      expect(maskPhoneNumber("   ")).toBe("****");
      expect(maskPhoneNumber(12345 as unknown as string)).toBe("****");
      expect(maskPhoneNumber({} as unknown as string)).toBe("****");
      expect(maskPhoneNumber(true as unknown as string)).toBe("****");
    });

    it("never returns devOtp when NODE_ENV is production", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        const { sendOtp } = await import("@/lib/sms/client");
        const res = await sendOtp("01712345678");
        expect(res.success).toBe(true);
        expect(res.devOtp).toBeUndefined();
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      }
    });

    it("returns devOtp only when NODE_ENV is development", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "development";
        const { sendOtp } = await import("@/lib/sms/client");
        const res = await sendOtp("01712345678");
        expect(res.success).toBe(true);
        expect(typeof res.devOtp).toBe("string");
        expect(res.devOtp).toHaveLength(6);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      }
    });
  });

  // =========================================================================
  // 3. Customer Account Deletion & Active Order, Return & Refund Guards (SEC-9-05)
  // =========================================================================
  describe("3. Account Deletion & Active Order, Return & Refund Guards (SEC-9-05)", () => {
    it("blocks account deletion when user has active in-transit orders", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-active-orders", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Customer has 1 active SHIPPED order
      mockPrismaOrderCount.mockResolvedValue(1);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(0);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have active, processing, or in-transit orders.",
      });
      expect(mockPrismaOrderCount).toHaveBeenCalledWith({
        where: {
          userId: "user-active-orders",
          status: {
            in: [
              "PENDING",
              "CONFIRMED",
              "PROCESSING",
              "SHIPPED",
              "RETURN_REQUESTED",
              "RETURN_PROCESSING",
            ],
          },
        },
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
      expect(mockPrismaCartDeleteMany).not.toHaveBeenCalled();
    });

    it("blocks account deletion when user has active return request with status PENDING", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-pending-return", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Zero active orders, but 1 active PENDING return request
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(1);
      mockPrismaRefundCount.mockResolvedValue(0);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have active return requests in progress.",
      });
      expect(mockPrismaReturnRequestCount).toHaveBeenCalledWith({
        where: {
          order: { userId: "user-pending-return" },
          status: {
            in: ["PENDING", "APPROVED", "RECEIVED"],
          },
        },
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });

    it("blocks account deletion when user has active return request with status APPROVED", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-approved-return", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Active APPROVED return
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(1);
      mockPrismaRefundCount.mockResolvedValue(0);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have active return requests in progress.",
      });
      expect(mockPrismaReturnRequestCount).toHaveBeenCalledWith({
        where: {
          order: { userId: "user-approved-return" },
          status: {
            in: ["PENDING", "APPROVED", "RECEIVED"],
          },
        },
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });

    it("blocks account deletion when user has active return request with status RECEIVED", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-received-return", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Active RECEIVED return
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(1);
      mockPrismaRefundCount.mockResolvedValue(0);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have active return requests in progress.",
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });

    it("blocks account deletion when user has active refund with status PENDING", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-pending-refund", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Zero active orders, zero returns, but 1 active PENDING refund
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(1);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have pending or processing refunds.",
      });
      expect(mockPrismaRefundCount).toHaveBeenCalledWith({
        where: {
          payment: { order: { userId: "user-pending-refund" } },
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });

    it("blocks account deletion when user has active refund with status PROCESSING", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-processing-refund", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Active PROCESSING refund
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(1);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({
        error: "Cannot delete account while you have pending or processing refunds.",
      });
      expect(mockPrismaRefundCount).toHaveBeenCalledWith({
        where: {
          payment: { order: { userId: "user-processing-refund" } },
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
      });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });

    it("allows account deletion when all orders, returns, and refunds are terminal, cleans up cart, and logs audit record", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({
        id: "user-clean",
        email: "clean@example.com",
        name: "Clean Customer",
      });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Zero active orders, zero active returns, zero active refunds
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(0);
      mockPrismaCartDeleteMany.mockResolvedValue({ count: 1 });
      mockPrismaSessionDeleteMany.mockResolvedValue({ count: 2 });
      mockPrismaAuditLogCreate.mockResolvedValue({ id: "audit-1" });
      mockPrismaUserDelete.mockResolvedValue({ id: "user-clean" });

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({ success: true });
      expect(mockPrismaCartDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-clean" } });
      expect(mockPrismaSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-clean" } });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: "user-clean",
          action: "CUSTOMER_SELF_DELETED",
          entityType: "User",
          entityId: "user-clean",
        }),
      });
      expect(mockPrismaUserDelete).toHaveBeenCalledWith({ where: { id: "user-clean" } });
    });

    it("executes row locks for User, Orders, and Payments in consistent order before deletion guards", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({
        id: "user-lock-test",
        email: "lock@example.com",
      });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(0);
      mockPrismaCartDeleteMany.mockResolvedValue({ count: 0 });
      mockPrismaSessionDeleteMany.mockResolvedValue({ count: 1 });
      mockPrismaAuditLogCreate.mockResolvedValue({ id: "audit-lock" });
      mockPrismaUserDelete.mockResolvedValue({ id: "user-lock-test" });

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({ success: true });
      expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(3);

      // 1. User lock query
      const userLockCall = mockPrismaQueryRaw.mock.calls[0];
      const userLockSql = (userLockCall[0] as unknown as string[]).join(" ");
      expect(userLockSql).toContain("SELECT \"id\"");
      expect(userLockSql).toContain("FROM \"User\"");
      expect(userLockSql).toContain("WHERE \"id\" =");
      expect(userLockSql).toContain("FOR UPDATE");
      expect(userLockCall[1]).toBe("user-lock-test");

      // 2. Order lock query
      const orderLockCall = mockPrismaQueryRaw.mock.calls[1];
      const orderLockSql = (orderLockCall[0] as unknown as string[]).join(" ");
      expect(orderLockSql).toContain("SELECT \"id\"");
      expect(orderLockSql).toContain("FROM \"Order\"");
      expect(orderLockSql).toContain("WHERE \"userId\" =");
      expect(orderLockSql).toContain("FOR UPDATE");
      expect(orderLockCall[1]).toBe("user-lock-test");

      // 3. Payment lock query
      const paymentLockCall = mockPrismaQueryRaw.mock.calls[2];
      const paymentLockSql = (paymentLockCall[0] as unknown as string[]).join(" ");
      expect(paymentLockSql).toContain("SELECT p.\"id\"");
      expect(paymentLockSql).toContain("FROM \"Payment\" p");
      expect(paymentLockSql).toContain("JOIN \"Order\" o ON p.\"orderId\" = o.\"id\"");
      expect(paymentLockSql).toContain("WHERE o.\"userId\" =");
      expect(paymentLockSql).toContain("FOR UPDATE");
      expect(paymentLockCall[1]).toBe("user-lock-test");
    });

    it("enforces strict execution sequence: User lock -> Order lock -> Payment lock -> Guard checks", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({
        id: "user-sequence-test",
        email: "seq@example.com",
      });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);

      const executionOrder: string[] = [];
      mockPrismaQueryRaw.mockImplementation((strings: TemplateStringsArray) => {
        const sql = strings.join(" ");
        if (sql.includes('"User"')) executionOrder.push("lock:User");
        else if (sql.includes('"Payment"')) executionOrder.push("lock:Payment");
        else if (sql.includes('"Order"')) executionOrder.push("lock:Order");
        return Promise.resolve([]);
      });

      mockPrismaOrderCount.mockImplementation(() => {
        executionOrder.push("guard:activeOrders");
        return Promise.resolve(0);
      });

      mockPrismaReturnRequestCount.mockImplementation(() => {
        executionOrder.push("guard:activeReturns");
        return Promise.resolve(0);
      });

      mockPrismaRefundCount.mockImplementation(() => {
        executionOrder.push("guard:activeRefunds");
        return Promise.resolve(0);
      });

      mockPrismaCartDeleteMany.mockResolvedValue({ count: 0 });
      mockPrismaSessionDeleteMany.mockResolvedValue({ count: 0 });
      mockPrismaAuditLogCreate.mockResolvedValue({ id: "audit-seq" });
      mockPrismaUserDelete.mockResolvedValue({ id: "user-sequence-test" });

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({ success: true });
      expect(executionOrder).toEqual([
        "lock:User",
        "lock:Order",
        "lock:Payment",
        "guard:activeOrders",
        "guard:activeReturns",
        "guard:activeRefunds",
      ]);
    });

    it("handles users with zero existing orders and payments safely", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({
        id: "user-zero-orders",
        email: "zero@example.com",
      });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(true);
      // Empty locks
      mockPrismaQueryRaw.mockResolvedValue([]);
      // Zero counts
      mockPrismaOrderCount.mockResolvedValue(0);
      mockPrismaReturnRequestCount.mockResolvedValue(0);
      mockPrismaRefundCount.mockResolvedValue(0);
      mockPrismaCartDeleteMany.mockResolvedValue({ count: 0 });
      mockPrismaSessionDeleteMany.mockResolvedValue({ count: 0 });
      mockPrismaAuditLogCreate.mockResolvedValue({ id: "audit-zero" });
      mockPrismaUserDelete.mockResolvedValue({ id: "user-zero-orders" });

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({ success: true });
      expect(mockPrismaUserDelete).toHaveBeenCalledWith({ where: { id: "user-zero-orders" } });
    });

    it("rejects account deletion when password does not match", async () => {
      const { deleteAccountAction } = await import("@/app/actions/account-deletion");

      mockRequireUser.mockResolvedValue({ id: "user-1", email: "cust@example.com" });
      mockCheckRateLimit.mockResolvedValue(undefined);
      mockPrismaUserFindUnique.mockResolvedValue({
        passwordHash: "$2b$12$dummyhashforpasswordtestinghere...",
      });
      mockCompare.mockResolvedValue(false);

      const result = await deleteAccountAction({ password: "WrongPassword" });

      expect(result).toEqual({ error: "Incorrect password." });
      expect(mockPrismaUserDelete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Customer Data Authorization & IDOR Protection (SEC-9-02)
  // =========================================================================
  describe("4. Customer Data Authorization & IDOR Protection (SEC-9-02)", () => {
    it("getCustomerOrder enforces userId filter to prevent cross-customer order viewing", async () => {
      const { getCustomerOrder } = await import("@/lib/orders/queries");
      mockAuth.mockResolvedValue({ user: { id: "customer-alice" } });
      mockPrismaOrderFindUnique.mockResolvedValue(null);

      const result = await getCustomerOrder("ORD-BOB-999");
      expect(result).toBeNull();
      expect(mockPrismaOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orderNumber: "ORD-BOB-999",
            userId: "customer-alice",
          },
        })
      );
    });

    it("getCustomerOrderConfirmation enforces userId filter to prevent receipt enumeration", async () => {
      const { getCustomerOrderConfirmation } = await import("@/lib/orders/queries");
      mockAuth.mockResolvedValue({ user: { id: "customer-alice" } });
      mockPrismaOrderFindFirst.mockResolvedValue(null);

      const result = await getCustomerOrderConfirmation("ORD-SECRET-123");
      expect(result).toBeNull();
      expect(mockPrismaOrderFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orderNumber: "ORD-SECRET-123",
            userId: "customer-alice",
          },
        })
      );
    });

    it("getCustomerAddresses strictly scopes query to authenticated userId", async () => {
      const { getCustomerAddresses } = await import("@/lib/account/queries");
      mockRequireUser.mockResolvedValue({ id: "customer-charlie" });
      mockPrismaAddressFindMany.mockResolvedValue([]);

      const addresses = await getCustomerAddresses();
      expect(addresses).toEqual([]);
      expect(mockPrismaAddressFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "customer-charlie" },
        })
      );
    });

    it("deleteAddressAction prevents deleting an address belonging to another user", async () => {
      const { deleteAddressAction } = await import("@/lib/account/actions");
      mockRequireUser.mockResolvedValue({ id: "customer-alice" });
      // 0 rows affected because the address belongs to customer-bob
      mockPrismaAddressDeleteMany.mockResolvedValue({ count: 0 });

      const result = await deleteAddressAction("addr-bob-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Address not found.");
      expect(mockPrismaAddressDeleteMany).toHaveBeenCalledWith({
        where: { id: "addr-bob-123", userId: "customer-alice" },
      });
    });
  });
});
