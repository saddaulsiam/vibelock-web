import "server-only";

import { env } from "@/lib/config/env";
import { Resend } from "resend";
import { maskEmail } from "@/lib/email/client";
import { getDisplayPhoneNumber, getWhatsAppUrl } from "@/lib/config/contact";

let resendClient: Resend | null = null;
if (env.RESEND_API_KEY) {
  resendClient = new Resend(env.RESEND_API_KEY);
}

export interface AbandonedEmailItem {
  productName: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string | null;
}

export interface AbandonedCartEmailData {
  customerName?: string | null;
  customerEmail: string;
  orderNumber?: string | null;
  recoveryUrl: string;
  items: AbandonedEmailItem[];
  subtotal: number;
  total: number;
}

const formatPrice = (amount: number) =>
  `৳${Math.round(amount).toLocaleString("en-BD")}`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sends a high-conversion abandoned cart/checkout recovery email via Resend.
 * Styled with VibeLock brutalist streetwear identity.
 */
export async function sendAbandonedCartEmail(
  data: AbandonedCartEmailData
): Promise<boolean> {
  if (!resendClient) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Abandoned Email Simulation] To: ${maskEmail(data.customerEmail)} | URL: ${data.recoveryUrl}`
      );
    }
    return true;
  }

  const rawName = data.customerName?.trim() || "Customer";
  const name = escapeHtml(rawName);

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
        <td style="padding: 12px 0;">
          <div style="font-weight: 700; font-size: 13px; color: #FFFFFF;">${escapeHtml(item.productName)}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">
            ${[item.size ? `Size: ${escapeHtml(item.size)}` : null, item.color ? `Color: ${escapeHtml(item.color)}` : null]
              .filter(Boolean)
              .join(" • ") || "Standard"}
          </div>
        </td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.7); font-family: monospace;">
          x${item.quantity}
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 13px; color: #FFFFFF; font-family: monospace;">
          ${formatPrice(item.lineTotal)}
        </td>
      </tr>
    `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your VibeLock Bag is Waiting</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #050608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #0A0D10; color: #F3F0E8; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 26px 20px; border-bottom: 2px solid #00D9FF; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #FFFFFF;">
            VIBE<span style="color: #00D9FF;">LOCK</span>
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.6);">
            Modern Dhaka Streetwear
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <div style="display: inline-block; background-color: rgba(0,217,255,0.1); border: 1px solid rgba(0,217,255,0.3); border-radius: 4px; padding: 4px 10px; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #00D9FF; margin-bottom: 16px;">
            Cart Recovery Notice
          </div>

          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px;">
            আসসালামু আলাইকুম ${name}! 👋
          </h2>
          <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.7);">
            আপনি VibeLock-এ কিছু প্রিমিয়াম ড্রপ-শোল্ডার পোশাক সিলেক্ট করেছিলেন, কিন্তু আপনার অর্ডারটি এখনও সম্পূর্ণ করা হয়নি। আমাদের স্টক সীমিত, তাই অন্য কেউ নেওয়ার আগেই ব্যাগটি কনফার্ম করে নিন।
          </p>

          <!-- Items Table -->
          <div style="background-color: #101317; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #00D9FF; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
              Reserved Items
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>

            <!-- Outlook/Client-Safe Total Row -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
              <tr>
                <td style="padding-top: 12px; font-size: 14px; font-weight: 900; color: #FFFFFF; text-align: left;">
                  Total Amount:
                </td>
                <td style="padding-top: 12px; font-size: 14px; font-weight: 900; color: #00D9FF; font-family: monospace; text-align: right;">
                  ${formatPrice(data.total)}
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 20px 0;">
            <a href="${escapeHtml(data.recoveryUrl)}" style="display: inline-block; background-color: #00D9FF; color: #050608; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; padding: 14px 36px; text-decoration: none; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,217,255,0.35);">
              Complete Your Order Now &rarr;
            </a>
          </div>

          <p style="text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">
            সাইজ বা ফিটিং নিয়ে প্রশ্ন থাকলে সরাসরি হোয়াটসঅ্যাপে মেসেজ দিন: <a href="${getWhatsAppUrl()}" style="color: #00D9FF; text-decoration: none;">${getDisplayPhoneNumber("international")}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #050608; padding: 20px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 10px; color: rgba(255,255,255,0.4); line-height: 1.6;">
          <p style="margin: 0;">VibeLock Bangladesh &bull; Official Automated Recovery Dispatch</p>
          <p style="margin: 4px 0 0 0;">Dhaka, Bangladesh &bull; Helpline: ${getDisplayPhoneNumber("international")}</p>
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const emailSubject = data.orderNumber
      ? `আপনার #${data.orderNumber} অর্ডারের আইটেমগুলো অপেক্ষা করছে 🛍️`
      : `আপনার VibeLock ব্যাগপ্যাকের আইটেমগুলো অপেক্ষা করছে 🛍️`;

    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: data.customerEmail,
      subject: emailSubject,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error(
      `[Abandoned Email Error] Failed to send email to ${maskEmail(data.customerEmail)}:`,
      error
    );
    return false;
  }
}
