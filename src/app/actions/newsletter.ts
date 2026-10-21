"use server";

import prisma from "@/lib/prisma/client";
import { sendNewsletterWelcomeEmail } from "@/lib/email/client";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
  source: z.string().trim().max(50).optional().default("ACCOUNT_SIDEBAR"),
});

export async function subscribeNewsletterAction(input: unknown) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email address.",
    };
  }

  const { email, source } = parsed.data;

  try {
    // Save or update subscriber in DB
    const prismaAny = prisma as any;
    if (typeof prismaAny.newsletterSubscriber?.upsert === "function") {
      await prismaAny.newsletterSubscriber.upsert({
        where: { email },
        create: { email, source, isActive: true },
        update: { isActive: true, source },
      });
    } else {
      await prisma.$executeRaw`
        INSERT INTO "NewsletterSubscriber" ("id", "email", "source", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${email}, ${source}, true, NOW(), NOW())
        ON CONFLICT ("email") DO UPDATE 
        SET "isActive" = true, "source" = ${source}, "updatedAt" = NOW()
      `;
    }

    // Trigger welcome email (non-blocking)
    void sendNewsletterWelcomeEmail(email).catch((err) => {
      console.error("[subscribeNewsletterAction] Email send failed:", err);
    });

    return {
      success: true,
      message: "You're on the list! Welcome to the VibeLock crew.",
    };
  } catch (error) {
    console.error("[subscribeNewsletterAction] Database error:", error);
    return {
      success: false,
      error: "Unable to process subscription right now. Please try again.",
    };
  }
}
