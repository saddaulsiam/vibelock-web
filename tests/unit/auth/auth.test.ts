/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import { authConfig } from "@/auth";
import prisma from "@/lib/prisma/client";

const { mockCompare } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
  default: {
    compare: mockCompare,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    AUTH_GOOGLE_ID: "mock-google-id",
    AUTH_GOOGLE_SECRET: "mock-google-secret",
  },
}));

vi.mock("@/lib/sms/client", () => ({
  verifyOtp: vi.fn(async (phone: string, otp: string) => otp === "123456"),
  sendOtp: vi.fn(async () => ({ success: true, devOtp: "123456" })),
}));

describe("Auth.js Configuration & JWT Strategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("session strategy is configured as JWT for Credentials compatibility", () => {
    expect(authConfig.session).toBeDefined();
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  test("jwt callback populates token with user id, role, and emailVerified on sign in", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    const mockUser = {
      id: "user-uuid-123",
      role: "ADMIN" as const,
      emailVerified: new Date("2026-01-01T00:00:00Z"),
    };

    const token = (await jwtCallback!({
      token: { sub: "user-uuid-123" },
      user: mockUser as any,
      account: null,
    })) as any;

    expect(token).toBeDefined();
    expect(token.id).toBe("user-uuid-123");
    expect(token.role).toBe("ADMIN");
    expect(token.emailVerified).toEqual(new Date("2026-01-01T00:00:00Z"));
  });

  test("jwt callback preserves existing token fields when user is not present", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    const initialToken = {
      sub: "user-uuid-123",
      id: "user-uuid-123",
      role: "CUSTOMER" as const,
      emailVerified: null,
    };

    const token = await jwtCallback!({
      token: initialToken,
      user: undefined as any,
      account: null,
    });

    expect(token).toEqual(initialToken);
  });

  test("session callback attaches id, role, and emailVerified from token to session.user", async () => {
    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const mockSession = {
      user: {
        name: "Test User",
        email: "test@example.com",
      },
      expires: new Date(Date.now() + 3600000).toISOString(),
    };

    const mockToken = {
      sub: "token-sub-456",
      id: "token-id-456",
      role: "ADMIN" as const,
      emailVerified: new Date("2026-01-01T00:00:00Z"),
    };

    const result = (await (sessionCallback as any)({
      session: mockSession,
      token: mockToken,
      user: undefined,
    })) as any;

    expect(result.user).toBeDefined();
    expect(result.user.id).toBe("token-id-456");
    expect(result.user.role).toBe("ADMIN");
    expect(result.user.emailVerified).toEqual(new Date("2026-01-01T00:00:00Z"));
  });

  test("session callback falls back to token.sub if token.id is missing", async () => {
    const sessionCallback = authConfig.callbacks?.session;
    const mockSession = {
      user: {
        name: "Test User",
        email: "test@example.com",
      },
      expires: new Date(Date.now() + 3600000).toISOString(),
    };

    const mockToken = {
      sub: "oauth-sub-789",
    };

    const result = (await (sessionCallback as any)({
      session: mockSession,
      token: mockToken,
      user: undefined,
    })) as any;

    expect(result.user.id).toBe("oauth-sub-789");
    expect(result.user.role).toBe("CUSTOMER");
    expect(result.user.emailVerified).toBeNull();
  });

  test("credentials provider authorize validates email and password", async () => {
    const credentialsProvider = authConfig.providers.find(
      (p: any) => typeof p === "object" && p?.id === "credentials"
    ) as any;

    expect(credentialsProvider).toBeDefined();
    const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;
    expect(typeof authorize).toBe("function");

    const findUniqueSpy = vi.spyOn(prisma.user, "findUnique");

    // Missing email or password
    expect(await authorize({ email: "", password: "" })).toBeNull();
    expect(await authorize({ email: "test@example.com" })).toBeNull();

    // User not found
    findUniqueSpy.mockResolvedValueOnce(null);
    expect(await authorize({ email: "notfound@example.com", password: "password123" })).toBeNull();

    // User has no password hash (OAuth user)
    findUniqueSpy.mockResolvedValueOnce({
      id: "oauth-user-id",
      email: "oauth@example.com",
      passwordHash: null,
    } as any);
    expect(await authorize({ email: "oauth@example.com", password: "password123" })).toBeNull();

    // Invalid password
    findUniqueSpy.mockResolvedValueOnce({
      id: "user-id",
      email: "user@example.com",
      passwordHash: "hashed-pw",
    } as any);
    mockCompare.mockResolvedValueOnce(false);
    expect(await authorize({ email: "user@example.com", password: "wrongpassword" })).toBeNull();

    // Valid credentials
    findUniqueSpy.mockResolvedValueOnce({
      id: "valid-user-id",
      name: "Valid User",
      email: "user@example.com",
      image: "https://example.com/avatar.jpg",
      role: "CUSTOMER",
      passwordHash: "hashed-pw",
      emailVerified: new Date("2026-02-01T00:00:00Z"),
    } as any);
    mockCompare.mockResolvedValueOnce(true);

    const user = await authorize({ email: "USER@EXAMPLE.COM", password: "correctpassword" });
    expect(user).toEqual({
      id: "valid-user-id",
      name: "Valid User",
      email: "user@example.com",
      image: "https://example.com/avatar.jpg",
      role: "CUSTOMER",
      emailVerified: new Date("2026-02-01T00:00:00Z"),
    });
  });

  test("credentials provider authorize supports phone and OTP login", async () => {
    const credentialsProvider = authConfig.providers.find(
      (p: any) => typeof p === "object" && p?.id === "credentials"
    ) as any;
    const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

    // Invalid OTP
    expect(await authorize({ phone: "01712345678", otp: "000000" })).toBeNull();

    // Valid OTP for existing user
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: "phone-user-id",
      name: "Phone User",
      email: "01712345678@vibelock.bd",
      phone: "01712345678",
      role: "CUSTOMER",
      phoneVerified: new Date("2026-01-01"),
    } as any);

    const user = await authorize({ phone: "01712345678", otp: "123456" });
    expect(user).toMatchObject({
      id: "phone-user-id",
      name: "Phone User",
      role: "CUSTOMER",
    });
  });
});

