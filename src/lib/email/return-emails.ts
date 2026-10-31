import "server-only";

import { env } from "@/lib/config/env";
import { appConfig } from "@/lib/config/app";
import { Resend } from "resend";
import { sendSmsNotification } from "@/lib/sms/client";

let resendClient: Resend | null = null;
if (env.RESEND_API_KEY) {
  resendClient = new Resend(env.RESEND_API_KEY);
}

const EMAIL_WRAPPER_HEADER = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0A0D10; color: #F3F0E8; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <div style="background-color: #000; padding: 24px 20px; border-bottom: 2px solid #00D9FF; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #FFFFFF;">
        VIBE<span style="color: #00D9FF;">LOCK</span>
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.6);">
        Returns &amp; Customer Care Desk
      </p>
    </div>
    <div style="padding: 28px 24px;">
`;

const EMAIL_WRAPPER_FOOTER = `
      <p style="margin: 28px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; line-height: 1.5;">
        VibeLock Bangladesh &bull; Official Customer Returns Department<br/>
        Dhaka, Bangladesh &bull; Hotline: 01700-000000
      </p>
    </div>
  </div>
`;

/**
 * 1. Notify Customer when Return is Approved & Steadfast Pickup is Scheduled
 */
export async function notifyReturnApproved({
  customerEmail,
  customerName,
  customerPhone,
  orderNumber,
  trackingCode,
}: {
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: string;
  trackingCode: string;
}) {
  const name = customerName || "Valued Customer";

  // Send SMS
  if (customerPhone) {
    await sendSmsNotification({
      phone: customerPhone,
      message: `[VibeLock] Hi ${name}, your return request for Order #${orderNumber} has been approved! Steadfast rider will collect the parcel. Tracking: ${trackingCode}. Keep items packed.`,
      purpose: "return_approved",
    });
  }

  // Send Email
  if (!resendClient) return;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: customerEmail,
      subject: `Return Approved // Steadfast Pickup Scheduled (Order #${orderNumber})`,
      html: `
        ${EMAIL_WRAPPER_HEADER}
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
          Your Return Request Is Approved
        </h2>
        <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.6; color: rgba(243,240,232,0.85);">
          Hi <strong>${name}</strong>, our team has reviewed and approved your return request for <strong>Order #${orderNumber}</strong>.
        </p>
        <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(0,217,255,0.25); border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #00D9FF; font-weight: 700; letter-spacing: 1px;">
            Reverse Courier Pickup
          </p>
          <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 900; color: #FFFFFF; font-family: monospace;">
            Steadfast Tracking: ${trackingCode}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: rgba(243,240,232,0.7); line-height: 1.5;">
            A Steadfast courier rider will visit your address to collect the parcel. Please keep the product securely inside the poly bag with tags attached.
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0 10px 0;">
          <a href="https://steadfast.com.bd/t/${trackingCode}" target="_blank" style="display: inline-block; padding: 11px 24px; background-color: #00D9FF; color: #0A0D10; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px;">
            Track Courier Pickup
          </a>
        </div>
        ${EMAIL_WRAPPER_FOOTER}
      `,
    });
  } catch (error) {
    console.error("[Email Error] Failed to send return approved email:", error);
  }
}

/**
 * 2. Notify Customer when Return Parcel is Received at Warehouse (QC in progress)
 */
export async function notifyReturnReceived({
  customerEmail,
  customerName,
  customerPhone,
  orderNumber,
}: {
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: string;
}) {
  const name = customerName || "Valued Customer";

  // Send SMS
  if (customerPhone) {
    await sendSmsNotification({
      phone: customerPhone,
      message: `[VibeLock] Hi ${name}, we have safely received your returned items for Order #${orderNumber} at our Dhaka warehouse. QC inspection is currently in progress.`,
      purpose: "return_received",
    });
  }

  // Send Email
  if (!resendClient) return;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: customerEmail,
      subject: `Parcel Received at Warehouse // QC in Progress (Order #${orderNumber})`,
      html: `
        ${EMAIL_WRAPPER_HEADER}
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
          Returned Parcel Received
        </h2>
        <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.6; color: rgba(243,240,232,0.85);">
          Hi <strong>${name}</strong>, your return package for <strong>Order #${orderNumber}</strong> has safely arrived at our central warehouse in Dhaka.
        </p>
        <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin: 18px 0;">
          <p style="margin: 0; font-size: 12px; color: rgba(243,240,232,0.8); line-height: 1.6;">
            &bull; <strong>Next Step:</strong> Our Quality Check (QC) team is inspecting the items.<br/>
            &bull; <strong>Turnaround:</strong> Once verification is complete (typically within 24 hours), your refund or 105% Store Credit voucher will be issued immediately.
          </p>
        </div>
        ${EMAIL_WRAPPER_FOOTER}
      `,
    });
  } catch (error) {
    console.error("[Email Error] Failed to send return received email:", error);
  }
}

/**
 * 3. Notify Customer when 105% Store Credit Voucher is Issued
 */
export async function notifyStoreCreditIssued({
  customerEmail,
  customerName,
  customerPhone,
  orderNumber,
  couponCode,
  voucherAmount,
  bonusAmount,
}: {
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: string;
  couponCode: string;
  voucherAmount: number;
  bonusAmount: number;
}) {
  const name = customerName || "Valued Customer";

  // Send SMS
  if (customerPhone) {
    await sendSmsNotification({
      phone: customerPhone,
      message: `[VibeLock] Congrats ${name}! Your 105% Store Credit voucher ${couponCode} (Value: BDT ${voucherAmount.toLocaleString("en-BD")}, incl. BDT ${bonusAmount.toLocaleString("en-BD")} bonus) has been issued for Order #${orderNumber}. Valid for 180 days!`,
      purpose: "store_credit_issued",
    });
  }

  // Send Email
  if (!resendClient) return;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: customerEmail,
      subject: `Your 105% Store Credit Voucher Has Arrived // ${couponCode}`,
      html: `
        ${EMAIL_WRAPPER_HEADER}
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
          Your 105% Store Credit Voucher Is Ready!
        </h2>
        <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.6; color: rgba(243,240,232,0.85);">
          Hi <strong>${name}</strong>, thank you for your patience during return processing for <strong>Order #${orderNumber}</strong>. As requested, we have issued your exclusive 105% Store Credit Voucher with an extra 5% shopping bonus!
        </p>

        <div style="background-color: #000; border: 2px dashed #00D9FF; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #00D9FF; font-weight: 800; letter-spacing: 2px;">
            Personal Store Voucher
          </p>
          <p style="margin: 10px 0; font-size: 26px; font-weight: 900; color: #FFFFFF; font-family: monospace; letter-spacing: 3px;">
            ${couponCode}
          </p>
          <p style="margin: 0; font-size: 15px; font-weight: 800; color: #10B981;">
            Value: ৳ ${voucherAmount.toLocaleString("en-BD")} <span style="font-size: 12px; color: rgba(255,255,255,0.7);">(Includes ৳ ${bonusAmount.toLocaleString("en-BD")} Free Bonus)</span>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.5);">
            Single-use &bull; No minimum order value &bull; Valid for 180 days
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0 10px 0;">
          <a href="${appConfig.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #00D9FF; color: #0A0D10; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 8px;">
            Shop Fresh Drops Now
          </a>
        </div>
        ${EMAIL_WRAPPER_FOOTER}
      `,
    });
  } catch (error) {
    console.error("[Email Error] Failed to send store credit email:", error);
  }
}

/**
 * 4. Notify Customer when Cash / Gateway Refund is Processed
 */
export async function notifyCashRefundProcessed({
  customerEmail,
  customerName,
  customerPhone,
  orderNumber,
  amount,
  gateway,
}: {
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderNumber: string;
  amount: number;
  gateway: string;
}) {
  const name = customerName || "Valued Customer";

  // Send SMS
  if (customerPhone) {
    await sendSmsNotification({
      phone: customerPhone,
      message: `[VibeLock] Hi ${name}, your refund of BDT ${amount.toLocaleString("en-BD")} for Order #${orderNumber} has been successfully processed via ${gateway}. Thank you for shopping with VibeLock.`,
      purpose: "refund_completed",
    });
  }

  // Send Email
  if (!resendClient) return;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: customerEmail,
      subject: `Refund Processed // ৳ ${amount.toLocaleString("en-BD")} (Order #${orderNumber})`,
      html: `
        ${EMAIL_WRAPPER_HEADER}
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
          Refund Completed
        </h2>
        <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.6; color: rgba(243,240,232,0.85);">
          Hi <strong>${name}</strong>, your refund for <strong>Order #${orderNumber}</strong> has been successfully issued.
        </p>
        <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin: 18px 0;">
          <p style="margin: 0; font-size: 12px; color: rgba(243,240,232,0.8); line-height: 1.6;">
            &bull; <strong>Amount Refunded:</strong> ৳ ${amount.toLocaleString("en-BD")}<br/>
            &bull; <strong>Payout Channel:</strong> ${gateway}<br/>
            &bull; <strong>Settlement Time:</strong> Depending on your bank/mobile wallet provider, funds typically reflect in your account within 1–3 business days.
          </p>
        </div>
        ${EMAIL_WRAPPER_FOOTER}
      `,
    });
  } catch (error) {
    console.error("[Email Error] Failed to send cash refund email:", error);
  }
}

