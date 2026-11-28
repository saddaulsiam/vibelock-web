import fs from "fs";
import { NextRequest } from "next/server";
import path from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "development",
    RESEND_API_KEY: undefined,
    EMAIL_FROM: "VibeLock <noreply@vibelock.bd>",
  },
}));

import nextConfig from "../../../next.config";
import { maskEmail } from "../../../src/lib/email/client";
import { proxy } from "../../../src/proxy";

describe("Phase 7: Infrastructure & Secrets Security", () => {
  // =========================================================================
  // 1. Next.js Infrastructure & Technology Disclosure Hardening
  // =========================================================================
  describe("1. Next.js Infrastructure Configuration", () => {
    it("disables X-Powered-By header to prevent framework technology disclosure", () => {
      expect(nextConfig.poweredByHeader).toBe(false);
    });

    it("configures standard security headers matching hardened policy", async () => {
      const rules = (await nextConfig.headers?.()) ?? [];
      const rootRule = rules.find((entry) => entry.source === "/(.*)");
      expect(rootRule).toBeDefined();

      const headers = new Map(
        rootRule?.headers.map(({ key, value }) => [key.toLowerCase(), value])
      );

      expect(headers.get("x-content-type-options")).toBe("nosniff");
      expect(headers.get("x-frame-options")).toBe("DENY");
      expect(headers.get("x-dns-prefetch-control")).toBe("on");
      expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(headers.get("strict-transport-security")).toBe(
        "max-age=31536000; includeSubDomains; preload"
      );
      expect(headers.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=()");

      // Static CSP must not be set here because dynamic nonce-based CSP is enforced in proxy
      expect(headers.has("content-security-policy")).toBe(false);
    });
  });

  // =========================================================================
  // 2. Dynamic Content Security Policy (CSP) Verification
  // =========================================================================
  describe("2. Dynamic Nonce-based CSP in Proxy", () => {
    it("returns per-request cryptographically unique nonce and strict CSP in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      try {
        const req1 = new NextRequest("https://vibelock.bd/shop");
        const res1 = proxy(req1);

        const req2 = new NextRequest("https://vibelock.bd/shop");
        const res2 = proxy(req2);

        const policy1 = res1.headers.get("content-security-policy") ?? "";
        const policy2 = res2.headers.get("content-security-policy") ?? "";

        const nonce1 = policy1.match(/'nonce-([^']+)'/)?.[1];
        const nonce2 = policy2.match(/'nonce-([^']+)'/)?.[1];

        // Unique nonces
        expect(nonce1).toBeTruthy();
        expect(nonce2).toBeTruthy();
        expect(nonce1).not.toBe(nonce2);

        // Strict CSP directives
        expect(policy1).toContain("default-src 'self'");
        expect(policy1).toContain("'strict-dynamic'");
        expect(policy1).not.toContain("'unsafe-eval'");
        expect(policy1).toContain("upgrade-insecure-requests");

        // Verified domain integrations: Google Avatars, Cloudinary, Vercel Insights & Scripts
        expect(policy1).toContain("https://res.cloudinary.com");
        expect(policy1).toContain("https://lh3.googleusercontent.com");
        expect(policy1).toContain("https://*.googleusercontent.com");
        expect(policy1).toContain("https://vitals.vercel-insights.com");
        expect(policy1).toContain("https://va.vercel-scripts.com");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("bypasses CSP evaluation in development mode for fast iteration", () => {
      vi.stubEnv("NODE_ENV", "development");
      try {
        const req = new NextRequest("http://localhost:3000/shop");
        const res = proxy(req);

        expect(res.headers.has("content-security-policy")).toBe(false);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  // =========================================================================
  // 3. GitHub Actions Least Privilege Workflow Permissions
  // =========================================================================
  describe("3. GitHub Actions Workflow Permissions", () => {
    const workflowsDir = path.resolve(process.cwd(), ".github/workflows");

    const workflows = ["ci.yml", "deploy-staging.yml", "migrate-production.yml"];

    workflows.forEach((workflowFile) => {
      it(`enforces explicit read-only permissions in ${workflowFile}`, () => {
        const filePath = path.join(workflowsDir, workflowFile);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, "utf-8");
        // Must contain permissions block with contents: read
        expect(content).toMatch(/permissions:\s*\n\s*contents:\s*read/);
      });
    });
  });

  // =========================================================================
  // 4. Logging & PII Masking Verification
  // =========================================================================
  describe("4. PII Protection in Logging", () => {
    it("masks customer email addresses to prevent PII exposure in server logs", () => {
      expect(maskEmail("customer@vibelock.bd")).toBe("c***@vibelock.bd");
      expect(maskEmail("siam@gmail.com")).toBe("s***@gmail.com");
      expect(maskEmail("john.doe@corporate.org")).toBe("j***@corporate.org");
    });

    it("safely handles edge cases and malformed emails without crashing", () => {
      expect(maskEmail("a@b.com")).toBe("***@***");
      expect(maskEmail("notanemail")).toBe("***@***");
      expect(maskEmail("")).toBe("***@***");
    });
  });

  // =========================================================================
  // 5. Environment & Public Configuration Boundary
  // =========================================================================
  describe("5. Environment Variable Secrets & HTTPS Enforcement", () => {
    it("ensures publicEnv only exposes safe non-secret configuration", async () => {
      const { publicEnv } = await import("../../../src/lib/config/public-env");
      const keys = Object.keys(publicEnv);

      // Only NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME are permitted
      expect(keys).toEqual(
        expect.arrayContaining(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"])
      );
      expect(keys.length).toBeLessThanOrEqual(3);

      // Verify no sensitive keys leaked into publicEnv
      const sensitivePatterns = [/secret/i, /token/i, /password/i, /key/i, /database/i];
      for (const key of keys) {
        if (key === "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" || key === "NEXT_PUBLIC_APP_URL") continue;
        for (const pattern of sensitivePatterns) {
          expect(key).not.toMatch(pattern);
        }
      }
    });
  });
});
