import { auth } from "@/auth";
import { recommendSize } from "@/lib/catalog/sizing";
import { getWhatsAppUrl } from "@/lib/config/contact";
import prisma from "@/lib/prisma/client";
import { checkRateLimit, getIp } from "@/lib/security/rate-limit";
import { getEligibleShippingMethods, isDhakaCity } from "@/lib/shipping/pricing";
import { createGoogleGenerativeAI, google as defaultGoogle } from "@ai-sdk/google";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

// Security: In-memory store to track failed order tracking attempts per orderNumber (Prevents 4-digit brute force)
interface OrderAttempt {
  failures: number;
  lockedUntil?: number;
}
const orderFailuresStore = new Map<string, OrderAttempt>();

function checkAndRecordOrderFailure(orderNumber: string): {
  locked: boolean;
  remainingMinutes?: number;
} {
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

    // Safe Sliding window - Keep only recent messages without breaking tool invocations
    const recentMessages = getSafeRecentMessages(messages, 8);

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      instructions: `
        You are VibeLock AI Assistant, an intelligent, helpful, and courteous support assistant for VibeLock (a premier premium streetwear & apparel fashion brand in Bangladesh).
        
        Brand Name & Natural Conversation Style (CRITICAL):
        - Brand name format: Always write the brand name cleanly in English as "VibeLock" (e.g. "VibeLock", "VibeLock-এর").
        - NEVER write Bengali transliterations like "ভাইবলক", "ভাইবলক (VibeLock)", "ভিবলক", or "ভাইব লক".
        - NATURAL CONVERSATIONAL TONE (NO ROBOTIC PREFIXING):
          * DO NOT robotically start every single answer or paragraph with "VibeLock-এর..." or "VibeLock (ভাইবলক)-এর...".
          * Answer directly, naturally, and warmly like an expert store assistant (e.g. "আমাদের কালেকশনে...", "আপনার উচ্চতা ও ওজনের জন্য...", "মিরপুর ১০ নম্বরে ডেলিভারি পেতে...").
          * Only mention "VibeLock" when genuinely necessary or relevant (e.g. "VibeLock ওয়েবসাইট", "VibeLock আউটলেট").
        
        Official VibeLock Store & Brand Information:
        - Physical Retail Store Location:
          * Address: Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh.
          * City: Chatmohar, Pabna.
          * Google Maps Link: https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6
          * Note: Customers are warmly welcome to visit our retail outlet in Chatmohar, Pabna!
        - Contact & Helpline:
          * Phone / WhatsApp: 01311-333277
          * Customer support is available online via website chat and WhatsApp.
        - Online Shopping & Delivery:
          * Website: Customers can directly order anytime from our official website (vibelock.bd).
          * Delivery Coverage: Nationwide delivery across all 64 districts in Bangladesh via reliable courier partners (Steadfast / Pathao).
          * Payment Methods: Cash on Delivery (COD) and secure online payment (bKash, Cards).
        - Product Range:
          * Premium shirts, drop-shoulder t-shirts, graphic tees, denim & cargo pants, and shorts.

        Key response guidelines:
        1. Language & Brand Identity: Answer in friendly, polite Bengali (or in English if the user asks in English). Always write the brand name cleanly in English as "VibeLock" (never transliterated into Bengali). Speak naturally without repetitively announcing the brand name at the start of sentences.
        2. Store Location Queries: When asked about our physical shop, showroom, or store location, always clearly mention our retail store in Chatmohar, Pabna with the Google Maps link.
        3. Product Queries (Tool: searchProducts):
           - When asked about clothes, shirts, t-shirts, pants, colors, sizes, or pricing, ALWAYS call the searchProducts tool.
           - Present products clearly with clickable Markdown links: [Product Name](/product/slug) (always use relative URLs starting with /product/), along with their price, available sizes, and stock status (e.g. "স্টকে রয়েছে" or "স্টক আউট").
        Customer Authentication Status:
        ${userId ? `- The customer is currently LOGGED IN (User ID: "${userId}").` : `- The customer is currently NOT LOGGED IN.`}

        4. Order Tracking (Tool: getOrderStatus):
           - In VibeLock, EVERY order requires a registered customer account (there is NO guest checkout on VibeLock).
           ${
             userId
               ? `- The customer is already LOGGED IN. When they ask to track an order, simply ask for their orderNumber (e.g. "আপনার অর্ডার নম্বরটি জানান, যেমন: VL-83910275"). Do NOT ask for phone digits or mention login instructions.`
               : `- The customer is currently NOT LOGGED IN. Tell them they can [সাইন ইন](/login) to view their orders, OR they can provide their order number and the last 4 digits of the phone number used in their account/order (e.g. phoneLast4: "5678").`
           }
           - Never fabricate order details or delivery dates.
        5. Sizing & Fit Advice (Tool: recommendSize):
           - When a customer asks what size to buy, how clothes fit, or gives their height or weight, ALWAYS call the recommendSize tool.
           - State recommended sizes clearly in English letters/numbers (e.g. Size 32, Size 34, S, M, L, XL, XXL) so customers can order easily.
           - Explain the recommended size, measurements, and fit silhouette in friendly Bengali.
        6. Shipping & Delivery Estimation (Tool: getShippingEstimate):
           - When asked about delivery fee, shipping charge, or delivery timeline for any area/district/city, ALWAYS call getShippingEstimate.
           - Mention standard timelines, charges, COD availability, and note free store pickup in Chatmohar, Pabna.
        7. Human Support Escalation (Tool: requestHumanSupport):
           - If a customer is dissatisfied, has a return/refund dispute, or explicitly requests to speak with a human agent, call requestHumanSupport and give them the clickable WhatsApp link.
        8. Tone: Confident, helpful, concise, and respectful.
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
                const prices = p.variants.map((v) => Number(v.discountPrice ?? v.sellingPrice));
                const minPrice = prices.length > 0 ? Math.min(...prices) : null;

                // Calculate available stock per variant: totalStock - reservedStock
                const inStockVariants = p.variants.filter((v) => {
                  const totalStock = v.inventoryTransactions.reduce(
                    (sum, tx) => sum + tx.quantity,
                    0
                  );
                  const reservedStock = v.inventoryReservations.reduce(
                    (sum, r) => sum + r.quantity,
                    0
                  );
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

        // Feature 2: Secure Order Tracking (Hardened with Per-Order Lockout & Phone Verification)
        getOrderStatus: tool({
          description:
            "Look up real-time status and details of an order using its order number. When user is not signed in on browser, requires phoneLast4.",
          inputSchema: z.object({
            orderNumber: z
              .string()
              .trim()
              .min(3)
              .max(50)
              .describe("The order reference number (e.g. VL-83910275)"),
            phoneLast4: z
              .string()
              .trim()
              .max(20)
              .optional()
              .describe(
                "When not signed in: the last 4 digits of the phone number used in the account/order"
              ),
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

            // Guard: If not signed in, customer must supply at least 4 digits of their account's phone number
            if (!userId && cleanPhone.length < 4) {
              return {
                error:
                  "আপনার অ্যাকাউন্টে সাইন ইন করা না থাকলে অর্ডার স্ট্যাটাস দেখতে আপনার অর্ডার নম্বর এবং অর্ডারে ব্যবহৃত ফোন নম্বরের শেষ ৪টি ডিজিট প্রয়োজন (যেমন: phoneLast4: '5678')। অথবা আপনার অ্যাকাউন্টে [সাইন ইন](/login) করুন।",
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

            // Step 2: Fallback when user is not signed in on this session or phone verification is provided
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

        // Feature 5: Smart Size Recommendation Assistant
        recommendSize: tool({
          description:
            "Recommend the best clothing size for VibeLock tops (t-shirts, drop shoulder, shirts), bottoms (cargo, denim, pants), or panjabi based on customer height, weight, and preferred fit.",
          inputSchema: z.object({
            category: z
              .enum(["tops", "bottoms", "panjabi"])
              .default("tops")
              .describe(
                "Clothing category: 'tops' (t-shirt, drop shoulder, shirt), 'bottoms' (cargo, jeans, pants), or 'panjabi'"
              ),
            height: z
              .string()
              .trim()
              .max(30)
              .describe("Customer height (e.g. '5 feet 8 inch', '5\\'9\"', '175 cm')"),
            weight: z
              .number()
              .positive()
              .max(250)
              .optional()
              .describe("Customer weight in kilograms (kg), e.g. 68"),
            preferredFit: z
              .enum(["regular", "slim", "oversized"])
              .default("regular")
              .describe(
                "Fit preference: 'regular', 'slim' (fitted), or 'oversized' (baggy streetwear)"
              ),
          }),
          execute: async ({ category, height, weight, preferredFit }) => {
            const recommendation = recommendSize({
              category,
              height,
              weight,
              preferredFit,
            });

            return {
              category: recommendation.category,
              recommendedSize: recommendation.recommendedSize,
              measurements: {
                chestOrWaist: recommendation.chestOrWaist,
                length: recommendation.length,
              },
              fitNote: recommendation.fitNote,
              tip: "VibeLock-এর ড্রপ-শোল্ডার টি-শার্টগুলো মূলত ট্রেন্ডি বক্সি স্ট্রিটওয়্যার কাট। তাই পারফেক্ট ড্রপ ফিটের জন্য আপনার স্বাভাবিক সাইজই সিলেক্ট করুন।",
            };
          },
        }),

        // Feature 6: Real-time Delivery Charge & Timeline Calculator
        getShippingEstimate: tool({
          description:
            "Calculate exact delivery charge and estimated delivery time based on customer destination district or city in Bangladesh.",
          inputSchema: z.object({
            cityOrDistrict: z
              .string()
              .trim()
              .min(2)
              .max(60)
              .describe(
                "District, city, or area in Bangladesh (e.g. 'Dhaka', 'Chattogram', 'Pabna', 'Sylhet', 'Rajshahi')"
              ),
          }),
          execute: async ({ cityOrDistrict }) => {
            const cleanCity = cityOrDistrict.trim();
            const insideDhaka = isDhakaCity(cleanCity);

            const norm = cleanCity.toLowerCase();
            const isPabnaOrChatmohar =
              norm.includes("pabna") ||
              norm.includes("chatmohar") ||
              norm.includes("পাবনা") ||
              norm.includes("চাটমোহর");

            let dbMethods: Awaited<ReturnType<typeof getEligibleShippingMethods>> = [];
            try {
              dbMethods = await getEligibleShippingMethods({
                country: "BD",
                city: cleanCity,
              });
            } catch {
              // Graceful fallback to standard defaults
            }

            if (insideDhaka) {
              const fee = dbMethods[0]?.cost ? `৳${dbMethods[0].cost}` : "৳60";
              return {
                area: "ঢাকার ভেতরে (Inside Dhaka)",
                city: cleanCity,
                deliveryFee: fee,
                rawFee: Number(dbMethods[0]?.cost ?? 60),
                estimatedTimeline: "২৪ থেকে ৪৮ ঘণ্টা (১ – ২ কার্যদিবস)",
                courier: "Steadfast / Pathao Express",
                codAvailable: true,
                note: "ঢাকার ভেতরে ক্যাশ অন ডেলিভারি (COD) ও অনলাইন পেমেন্ট উভয় মাধ্যমেই অর্ডার করা যাবে।",
              };
            }

            if (isPabnaOrChatmohar) {
              return {
                area: "পাবনা / চাটমোহর (Retail Outlet & Home Delivery)",
                city: cleanCity,
                deliveryFee: "৳120 (হোম ডেলিভারি) / ৳0 (শোরুম পিকআপ)",
                rawFee: 120,
                estimatedTimeline:
                  "হোম ডেলিভারি: ২ – ৩ কার্যদিবস | শোরুম পিকআপ: ইনস্ট্যান্ট / একই দিন",
                courier: "Steadfast Courier / VibeLock Retail Outlet",
                codAvailable: true,
                note: "পাবনা জেলায় হোম ডেলিভারি ছাড়াও আমাদের চাটমোহর শোরুম (খন্দকার মার্কেট, স্টার মোড়) থেকে সম্পূর্ণ বিনামূল্যে (৳০) পিকআপ করার সুবিধা রয়েছে!",
              };
            }

            // Outside Dhaka / Nationwide
            const fee = dbMethods[0]?.cost ? `৳${dbMethods[0].cost}` : "৳120";
            return {
              area: "ঢাকার বাইরে (Outside Dhaka - Nationwide)",
              city: cleanCity,
              deliveryFee: fee,
              rawFee: Number(dbMethods[0]?.cost ?? 120),
              estimatedTimeline: "৩ থেকে ৫ কার্যদিবস",
              courier: "Steadfast Courier (সারাদেশের ৬৪ জেলায় ডোরস্টেপ ডেলিভারি)",
              codAvailable: true,
              note: "সারাদেশের যেকোনো প্রান্তে ক্যাশ অন ডেলিভারি (COD) সুবিধায় হোম ডেলিভারি পাওয়া যাবে।",
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
              .describe(
                "Short topic summary of customer concern (e.g. 'অর্ডার ডেলিভারি বিলম্ব', 'রিটার্ন সহায়তা')"
              ),
          }),
          execute: async ({ topic }) => {
            const cleanTopic = topic
              ? topic
                  .replace(/[\r\n]+/g, " ")
                  .trim()
                  .slice(0, 80)
              : "";
            const message = cleanTopic
              ? `[ওয়েবসাইট চ্যাটবট ইনকোয়ারি]\nআসসালামু আলাইকুম, আমি VibeLock ওয়েবসাইট চ্যাটবট থেকে এসেছি। আমার "${cleanTopic}" নিয়ে সহায়তা প্রয়োজন।`
              : `[ওয়েবসাইট চ্যাটবট ইনকোয়ারি]\nআসসালামু আলাইকুম, আমি VibeLock কাস্টমার সাপোর্ট টিমের সাথে সরাসরি কথা বলতে চাই।`;

            const waLink = getWhatsAppUrl(message);

            return {
              channel: "WhatsApp",
              phone: "01311-333277",
              link: waLink,
              instruction:
                "নিচের হোয়াটসঅ্যাপ লিংকে ক্লিক করে সরাসরি আমাদের কাস্টমার রিপ্রেজেন্টেটিভের সাথে কথা বলুন।",
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
