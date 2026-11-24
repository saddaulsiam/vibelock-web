import { NextRequest } from "next/server";
import { createGoogleGenerativeAI, google as defaultGoogle } from "@ai-sdk/google";
import { streamText, convertToModelMessages, isStepCount, tool, type UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { checkRateLimit, getIp } from "@/lib/security/rate-limit";
import { getWhatsAppUrl } from "@/lib/config/contact";

export const maxDuration = 30;

// Security: In-memory store to track failed order tracking attempts per orderNumber (Prevents 4-digit brute force)
interface OrderAttempt {
  failures: number;
  lockedUntil?: number;
}
const orderFailuresStore = new Map<string, OrderAttempt>();

function checkAndRecordOrderFailure(orderNumber: string): { locked: boolean; remainingMinutes?: number } {
  const normalizedKey = orderNumber.trim().toUpperCase();
  const now = Date.now();
  const record = orderFailuresStore.get(normalizedKey) || { failures: 0 };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { locked: true, remainingMinutes };
  }

  record.failures += 1;
  if (record.failures >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    orderFailuresStore.set(normalizedKey, record);
    return { locked: true, remainingMinutes: 15 };
  }

  orderFailuresStore.set(normalizedKey, record);
  return { locked: false };
}

function clearOrderFailure(orderNumber: string) {
  orderFailuresStore.delete(orderNumber.trim().toUpperCase());
}

export function resetOrderFailuresStore() {
  orderFailuresStore.clear();
}

/**
 * Safe sliding window: Slices messages while ensuring the context starts with a 'user' turn
 * to avoid orphaned tool-calls or tool-results that trigger Gemini 400 Bad Request errors.
 */
export function getSafeRecentMessages(messages: UIMessage[], targetCount = 8): UIMessage[] {
  if (!Array.isArray(messages) || messages.length <= targetCount) {
    return messages || [];
  }

  let startIndex = Math.max(0, messages.length - targetCount);

  // Search forward for a user message
  while (startIndex < messages.length && messages[startIndex].role !== "user") {
    startIndex++;
  }

  // Fallback: If no user message found in forward slice, walk backward to guarantee a valid user start
  if (startIndex >= messages.length) {
    startIndex = Math.max(0, messages.length - targetCount);
    while (startIndex > 0 && messages[startIndex].role !== "user") {
      startIndex--;
    }
  }

  return messages.slice(startIndex);
}

export async function POST(req: NextRequest) {
  // 1. Resolve client IP and enforce rate limiting (15 requests/min per IP/User)
  const clientIp = await getIp(req.headers);
  const session = await auth();
  const userId = session?.user?.id;

  try {
    await checkRateLimit("chat", userId ? `user:${userId}` : undefined, {
      explicitIp: clientIp || undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return new Response(
        JSON.stringify({
          error: "অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    throw error;
  }

  // 2. Validate API Key from multiple supported environment variable names
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey && process.env.NODE_ENV !== "test") {
    console.error(
      "[VibeLock Chat Error]: Google Generative AI API key is missing. Add GOOGLE_GENERATIVE_AI_API_KEY in .env.local and restart the development server."
    );
    return new Response(
      JSON.stringify({
        error:
          "Google AI API Key পাওয়া যায়নি। অনুগ্রহ করে .env.local ফাইলে GOOGLE_GENERATIVE_AI_API_KEY সেট করে ডেভ সার্ভার রিস্টার্ট করুন।",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const google = apiKey ? createGoogleGenerativeAI({ apiKey }) : defaultGoogle;

  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Feature 3: Safe Sliding window - Keep only recent messages without breaking tool invocations
    const recentMessages = getSafeRecentMessages(messages, 8);

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      instructions: `
        You are VibeLock AI Assistant, an intelligent, helpful, and courteous support assistant for VibeLock (a premier premium streetwear & apparel fashion brand in Bangladesh).
        
        Brand Name & Bengali Spelling Rule (CRITICAL):
        - The brand name is VibeLock.
        - When writing or referring to the brand name in Bengali, ALWAYS write "ভাইবলক" (or "VibeLock (ভাইবলক)").
        - NEVER write "ভিবলক", "ভাইব লক", or any other variation. The only correct Bengali spelling is strictly "ভাইবলক".
        
        Official VibeLock Store & Brand Information:
        - Physical Retail Store Location:
          * Address: Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh.
          * City: Chatmohar, Pabna.
          * Google Maps Link: https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6
          * Note: Customers are warmly welcome to visit our retail outlet in Chatmohar, Pabna!
        - Contact & Helpline:
          * Phone / WhatsApp: 01311-333277 (+8801311333277)
          * Customer support is available online via website chat and WhatsApp.
        - Online Shopping & Delivery:
          * Website: Customers can directly order anytime from our official website (vibelock.bd).
          * Delivery Coverage: Nationwide delivery across all 64 districts in Bangladesh via reliable courier partners (Steadfast / Pathao).
          * Payment Methods: Cash on Delivery (COD) and secure online payment (bKash, Cards).
        - Product Range:
          * Premium shirts, drop-shoulder t-shirts, graphic tees, denim & cargo pants, and shorts.

        Key response guidelines:
        1. Language & Brand Identity: Answer in friendly, polite Bengali (or in English if the user asks in English). In Bengali, always write the brand name as "ভাইবলক".
        2. Store Location Queries: When asked about our physical shop, showroom, or store location, always clearly mention our retail store in Chatmohar, Pabna with the Google Maps link.
        3. Product Queries (Tool: searchProducts):
           - When asked about clothes, shirts, t-shirts, pants, colors, sizes, or pricing, ALWAYS call the searchProducts tool.
           - Present products clearly with Markdown links: [Product Name](url) along with their price, available sizes, and stock status (e.g. "স্টকে রয়েছে" or "স্টক আউট").
        4. Order Tracking (Tool: getOrderStatus):
           - If the user is logged in, query using orderNumber.
           - If the user is not logged in (Guest), ask for both the order number and the last 4 digits of their phone number (e.g. phoneLast4: "5678").
           - Never fabricate order details or delivery dates.
        5. Human Support Escalation (Tool: requestHumanSupport):
           - If a customer is dissatisfied, has a return/refund dispute, or explicitly requests to speak with a human agent, call requestHumanSupport and give them the clickable WhatsApp link.
        6. Tone: Confident, helpful, concise, and respectful.
      `,
      messages: await convertToModelMessages(recentMessages),
      stopWhen: isStepCount(5),
      maxRetries: 5,
      onError: ({ error }) => {
        console.error("[VibeLock Chat Stream Error]:", error);
      },
      tools: {
        // Feature 1: Product Catalog Search (Hardened against ReDoS & Stock Hallucinations)
        searchProducts: tool({
          description:
            "Search published VibeLock products by keywords, category, or budget. Returns product names, prices, stock availability, and links.",
          inputSchema: z.object({
            query: z
              .string()
              .trim()
              .max(80)
              .optional()
              .describe("Search keywords like 'shirt', 'drop shoulder', 'black', 'cargo'"),
            category: z
              .string()
              .trim()
              .max(50)
              .optional()
              .describe("Category name or slug like 'shirts', 't-shirts', 'pants'"),
            maxPrice: z
              .number()
              .positive()
              .max(100000)
              .optional()
              .describe("Maximum price in BDT (Taka)"),
          }),
          execute: async ({ query, category, maxPrice }) => {
            const cleanQuery = query?.trim().slice(0, 80);
            const cleanCategory = category?.trim().slice(0, 50);

            const whereClause: Record<string, unknown> = {
              status: "PUBLISHED",
            };

            if (cleanQuery) {
              whereClause.OR = [
                { name: { contains: cleanQuery, mode: "insensitive" } },
                { description: { contains: cleanQuery, mode: "insensitive" } },
              ];
            }

            if (cleanCategory) {
              whereClause.categories = {
                some: {
                  OR: [
                    { name: { contains: cleanCategory, mode: "insensitive" } },
                    { slug: { contains: cleanCategory.toLowerCase(), mode: "insensitive" } },
                  ],
                },
              };
            }

            const products = await prisma.product.findMany({
              where: whereClause,
              take: 5,
              select: {
                name: true,
                slug: true,
                variants: {
                  take: 20, // Inspect up to 20 variants to cover all sizes and colors
                  select: {
                    size: true,
                    color: true,
                    sellingPrice: true,
                    discountPrice: true,
                    inventoryTransactions: { select: { quantity: true } },
                    inventoryReservations: {
                      where: {
                        status: "RESERVED",
                        expiresAt: { gt: new Date() },
                      },
                      select: { quantity: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            });

            if (products.length === 0) {
              return {
                message: "আপনার অনুসন্ধানের সাথে মিল রেখে এই মুহূর্তে কোনো প্রোডাক্ট পাওয়া যায়নি।",
                items: [],
              };
            }

            const filtered = products
              .map((p) => {
                const prices = p.variants.map((v) =>
                  Number(v.discountPrice ?? v.sellingPrice)
                );
                const minPrice = prices.length > 0 ? Math.min(...prices) : null;

                // Calculate available stock per variant: totalStock - reservedStock
                const inStockVariants = p.variants.filter((v) => {
                  const totalStock = v.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
                  const reservedStock = v.inventoryReservations.reduce((sum, r) => sum + r.quantity, 0);
                  return totalStock - reservedStock > 0;
                });

                const isAvailable = inStockVariants.length > 0;
                const availableSizes = Array.from(
                  new Set(
                    (isAvailable ? inStockVariants : p.variants)
                      .map((v) => v.size)
                      .filter((s): s is string => Boolean(s))
                  )
                );

                return {
                  name: p.name,
                  url: `/product/${p.slug}`,
                  price: minPrice ? `৳${minPrice}` : "মূল্য দেখতে ভিজিট করুন",
                  rawPrice: minPrice ?? 0,
                  sizes: availableSizes,
                  inStock: isAvailable,
                  stockStatus: isAvailable ? "স্টকে রয়েছে" : "স্টক আউট",
                };
              })
              .filter((p) => (maxPrice ? p.rawPrice <= maxPrice : true));

            return {
              items: filtered,
            };
          },
        }),

        // Feature 2: Secure Order Tracking (Hardened with Per-Order Lockout & Guest Fallback)
        getOrderStatus: tool({
          description:
            "Look up real-time status and details of an order using its order number. For guest users without login, requires phoneLast4.",
          inputSchema: z.object({
            orderNumber: z
              .string()
              .trim()
              .min(3)
              .max(50)
              .describe("The order reference number (e.g. VL-20261121-316C6D)"),
            phoneLast4: z
              .string()
              .trim()
              .max(20)
              .optional()
              .describe("For guest users: the last 4 digits of the phone number used in the order"),
          }),
          execute: async ({ orderNumber, phoneLast4 }) => {
            const normalizedOrderNo = orderNumber.trim();
            const cleanPhone = phoneLast4 ? phoneLast4.replace(/\D/g, "") : "";

            // Check if this order is currently locked due to too many failed attempts
            const lockCheck = orderFailuresStore.get(normalizedOrderNo.toUpperCase());
            const now = Date.now();
            if (lockCheck?.lockedUntil && lockCheck.lockedUntil > now) {
              const remaining = Math.ceil((lockCheck.lockedUntil - now) / 60000);
              return {
                error: `নিরাপত্তাজনিত কারণে এই অর্ডারের তথ্য অনুসন্ধান সাময়িকভাবে স্থগিত রয়েছে। অনুগ্রহ করে ${remaining} মিনিট পর আবার চেষ্টা করুন অথবা আমাদের কাস্টমার সার্ভিসে যোগাযোগ করুন।`,
              };
            }

            // Guard: Guest users must supply at least 4 digits of the phone number
            if (!userId && cleanPhone.length < 4) {
              return {
                error:
                  "লগইন ছাড়া গেস্ট হিসেবে অর্ডার ট্র্যাক করতে আপনার অর্ডারে ব্যবহৃত ফোন নম্বরের শেষ ৪টি ডিজিট প্রয়োজন (যেমন: phoneLast4: '5678')। অথবা আপনার অ্যাকাউন্টে সাইন ইন করুন।",
              };
            }

            let order = null;

            // Step 1: If user is logged in, try fetching their own order first
            if (userId) {
              order = await prisma.order.findFirst({
                where: {
                  orderNumber: normalizedOrderNo,
                  userId: userId,
                },
                select: {
                  orderNumber: true,
                  status: true,
                  paymentStatus: true,
                  shippingMethodName: true,
                  createdAt: true,
                  items: {
                    select: {
                      productName: true,
                      quantity: true,
                      size: true,
                      color: true,
                    },
                  },
                  shipment: {
                    select: {
                      provider: true,
                      trackingNumber: true,
                      status: true,
                      shippedAt: true,
                      deliveredAt: true,
                    },
                  },
                },
              });
            }

            // Step 2: Fallback for guest orders or logged-in users checking past guest orders with phone verification
            if (!order && cleanPhone.length >= 4) {
              order = await prisma.order.findFirst({
                where: {
                  orderNumber: normalizedOrderNo,
                  customerPhone: {
                    endsWith: cleanPhone.slice(-4),
                  },
                },
                select: {
                  orderNumber: true,
                  status: true,
                  paymentStatus: true,
                  shippingMethodName: true,
                  createdAt: true,
                  items: {
                    select: {
                      productName: true,
                      quantity: true,
                      size: true,
                      color: true,
                    },
                  },
                  shipment: {
                    select: {
                      provider: true,
                      trackingNumber: true,
                      status: true,
                      shippedAt: true,
                      deliveredAt: true,
                    },
                  },
                },
              });
            }

            // If still not found, record a failure against this orderNumber to prevent brute-forcing
            if (!order) {
              const failure = checkAndRecordOrderFailure(normalizedOrderNo);
              if (failure.locked) {
                return {
                  error:
                    "ভুল তথ্য দিয়ে একাধিকবার চেষ্টার কারণে এই অর্ডারের তথ্য অনুসন্ধান ১৫ মিনিটের জন্য স্থগিত করা হয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন বা কাস্টমার সাপোর্টে যোগাযোগ করুন।",
                };
              }
              return {
                error:
                  "প্রদত্ত তথ্য অনুযায়ী কোনো অর্ডার পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর ও ফোন নম্বর চেক করুন।",
              };
            }

            // Success: clear any failure counter for this order
            clearOrderFailure(normalizedOrderNo);

            return {
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              shippingMethod: order.shippingMethodName,
              orderedAt: order.createdAt.toLocaleDateString("bn-BD", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              items: order.items.map((i) => ({
                product: i.productName,
                quantity: i.quantity,
                size: i.size ?? "N/A",
                color: i.color ?? "N/A",
              })),
              shipment: order.shipment
                ? {
                    provider: order.shipment.provider,
                    trackingNumber: order.shipment.trackingNumber ?? "প্রক্রিয়াধীন",
                    status: order.shipment.status,
                    shippedAt: order.shipment.shippedAt
                      ? order.shipment.shippedAt.toLocaleDateString("bn-BD")
                      : null,
                  }
                : null,
            };
          },
        }),

        // Feature 4: 1-Click WhatsApp Human Support Handoff (Hardened against Social Engineering)
        requestHumanSupport: tool({
          description:
            "Provide a direct 1-click WhatsApp handoff link when the customer wants to speak with a human agent or needs dispute assistance.",
          inputSchema: z.object({
            topic: z
              .string()
              .trim()
              .max(100)
              .optional()
              .describe("Short topic summary of customer concern (e.g. 'অর্ডার ডেলিভারি বিলম্ব', 'রিটার্ন সহায়তা')"),
          }),
          execute: async ({ topic }) => {
            const cleanTopic = topic ? topic.replace(/[\r\n]+/g, " ").trim().slice(0, 80) : "";
            const message = cleanTopic
              ? `[ওয়েবসাইট চ্যাটবট ইনকোয়ারি]\nআসসালামু আলাইকুম, আমি ভাইবলক ওয়েবসাইট চ্যাটবট থেকে এসেছি। আমার "${cleanTopic}" নিয়ে সহায়তা প্রয়োজন।`
              : `[ওয়েবসাইট চ্যাটবট ইনকোয়ারি]\nআসসালামু আলাইকুম, আমি ভাইবলক কাস্টমার সাপোর্ট টিমের সাথে সরাসরি কথা বলতে চাই।`;

            const waLink = getWhatsAppUrl(message);

            return {
              channel: "WhatsApp",
              phone: "01311-333277",
              link: waLink,
              instruction: "নিচের হোয়াটসঅ্যাপ লিংকে ক্লিক করে সরাসরি আমাদের কাস্টমার রিপ্রেজেন্টেটিভের সাথে কথা বলুন।",
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[VibeLock Chat Handler Error]:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
