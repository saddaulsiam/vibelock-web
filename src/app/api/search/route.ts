import { mapProductSummary } from "@/lib/catalog/mappers";
import prisma from "@/lib/prisma/client";
import { checkRateLimit, getIp, hashForRateLimit } from "@/lib/security/rate-limit";
import { ProductStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Search query must not exceed 100 characters")
    .optional()
    .default(""),
});

export async function GET(request: NextRequest) {
  try {
    // Resolve client identifier for search rate limiting:
    // 1. Primary: Trusted client IP from Vercel edge reverse proxy (x-real-ip / x-vercel-forwarded-for / x-forwarded-for).
    // 2. Fallback when trusted IP is unavailable (e.g. local dev, test environments, or stripped headers):
    //    a. Authenticated Users: Keyed by hashed session token (`sess:${hashForRateLimit(sessionToken, { raw: true })}`).
    //       Uses exact token bytes without lowercasing/trimming to preserve token entropy and prevent collisions.
    //       Provides isolated rate limiting (60 req/min) per logged-in account.
    //    b. Guest Users with Cart: Keyed by hashed cart ID (`cart:${hashForRateLimit(cartId, { raw: true })}`).
    //       Uses exact cart ID bytes without lowercasing/trimming.
    //       Provides isolated rate limiting (60 req/min) per shopping session.
    //    c. Anonymous Visitors with No IP & No Cookies:
    //       LIMITATION & POLICY DOCUMENTATION:
    //       Without a verified proxy-provided IP or a stable client cookie, anonymous requests
    //       cannot be reliably differentiated from each other.
    //       - A global shared "anonymous" bucket is rejected: it creates a critical shared-bucket DoS
    //         vulnerability where one abusive visitor exhausts search quota for all unauthenticated users.
    //       - User-Agent-based throttling is rejected: User-Agent is untrusted, trivially randomized by attackers
    //         (bypassing any limit), while shared by millions of legitimate users (causing false-positive collisions).
    //       - Policy Decision (Fail-Open with Structured Warning): For this public, read-only storefront search endpoint,
    //         anonymous requests lacking trusted IP headers fail open (rate limiting is bypassed).
    //         IMPORTANT: This fail-open policy does NOT provide DoS protection against high-volume automated traffic;
    //         rather, it prioritizes search availability for legitimate visitors over a self-inflicted denial-of-service
    //         from a shared bucket. Endpoint safety is bounded by strict input validation (q max 100 chars), hard
    //         query limits (take: 8), and reading only published products. A structured server-side warning
    //         (RATE_LIMIT_MISSING_CLIENT_IP) is emitted for operational visibility without logging PII.
    const clientIp = await getIp(request.headers);

    let searchIdentifier: string | null = null;
    if (clientIp) {
      searchIdentifier = clientIp;
    } else {
      const sessionToken =
        request.cookies.get("authjs.session-token")?.value ||
        request.cookies.get("__Secure-authjs.session-token")?.value;
      const cartId = request.cookies.get("vbl_cart_id")?.value;

      if (sessionToken) {
        searchIdentifier = `sess:${hashForRateLimit(sessionToken, { raw: true })}`;
      } else if (cartId) {
        searchIdentifier = `cart:${hashForRateLimit(cartId, { raw: true })}`;
      } else {
        // Anonymous request without trusted IP or cookies: fail-open policy
        console.warn(
          JSON.stringify({
            event: "RATE_LIMIT_MISSING_CLIENT_IP",
            level: "warn",
            endpoint: "search",
            policy: "fail_open",
            message:
              "Client IP could not be resolved from trusted proxy headers and no session/cart cookie present. Rate limit bypassed for public search (fail-open).",
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    if (searchIdentifier) {
      try {
        await checkRateLimit("search", searchIdentifier, { skipIp: true });
      } catch (rateLimitErr) {
        if (rateLimitErr instanceof Error && rateLimitErr.message === "RATE_LIMIT_EXCEEDED") {
          return NextResponse.json(
            { error: "Too many requests. Please slow down." },
            { status: 429 }
          );
        }
        throw rateLimitErr;
      }
    }

    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q");

    const parseResult = searchQuerySchema.safeParse({ q: rawQ ?? "" });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid search query. Maximum length is 100 characters." },
        { status: 400 }
      );
    }

    const q = parseResult.data.q;

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { categories: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: {
        images: true,
        categories: true,
        variants: {
          include: {
            inventoryTransactions: { select: { quantity: true } },
            inventoryReservations: {
              select: { quantity: true, expiresAt: true },
              where: { status: "RESERVED" as const },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const mapped = products.map(mapProductSummary);

    return NextResponse.json({ products: mapped });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
