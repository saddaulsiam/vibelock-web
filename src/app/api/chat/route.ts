import { NextRequest } from "next/server";
import { createGoogleGenerativeAI, google as defaultGoogle } from "@ai-sdk/google";
import { streamText, convertToModelMessages, isStepCount, tool, type UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { checkRateLimit, getIp } from "@/lib/security/rate-limit";

export const maxDuration = 30;

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
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey && process.env.NODE_ENV !== "test") {
    console.error(
      "[VibeLock Chat Error]: Google Generative AI API key is missing. Add GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY in .env.local and restart the Next.js development server."
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
        2. Store Location Queries: When asked about our physical shop, showroom, or store location, always clearly mention our retail store: "আমাদের ফিজিক্যাল শোরুম/স্টোর রয়েছে পাবনার চাটমোহরে: খন্দকার মার্কেট, স্টার মোড়, চাটমোহর, পাবনা।" Also mention that we deliver all over Bangladesh from our website.
        3. Accuracy & Anti-Hallucination: Never invent tracking numbers, order statuses, prices, or delivery guarantees.
        4. Order Tracking:
           - When a customer asks about their order or provides an order number, always call the getOrderStatus tool.
           - If the user is not logged in, politely ask them to log in to their VibeLock account to view personal order records.
           - If the order is not found in their account, explain that the order was not found and suggest double-checking the order number or reaching out to support at 01311-333277.
        5. Tone: Confident, helpful, concise, and respectful.
      `,
      messages: await convertToModelMessages(messages),
      stopWhen: isStepCount(5),
      maxRetries: 5,
      onError: ({ error }) => {
        console.error("[VibeLock Chat Stream Error]:", error);
      },
      tools: {
        getOrderStatus: tool({
          description:
            "Look up real-time status and details of an order using its order number (e.g. VL-XXXX-XXXX).",
          inputSchema: z.object({
            orderNumber: z
              .string()
              .describe("The order reference number (e.g. VL-20261121-316C6D)"),
          }),
          execute: async ({ orderNumber }) => {
            if (!userId) {
              return {
                error: "অর্ডার ট্র্যাক করতে অনুগ্রহ করে আপনার VibeLock অ্যাকাউন্টে সাইন ইন করুন।",
              };
            }

            const order = await prisma.order.findFirst({
              where: {
                orderNumber: orderNumber.trim(),
                userId: userId, // Strict ownership check: customer can only query their own orders
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

            if (!order) {
              return {
                error:
                  "আপনার অ্যাকাউন্টে এই অর্ডার নম্বরটি পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর দিন।",
              };
            }

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
                    trackingNumber: order.shipment.trackingNumber ?? "Processing",
                    status: order.shipment.status,
                    shippedAt: order.shipment.shippedAt
                      ? order.shipment.shippedAt.toLocaleDateString("bn-BD")
                      : null,
                  }
                : null,
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
