import "server-only";

import { env } from "@/lib/config/env";
import { appConfig } from "@/lib/config/app";
import { Resend } from "resend";

let resendClient: Resend | null = null;
if (env.RESEND_API_KEY) {
  resendClient = new Resend(env.RESEND_API_KEY);
}

export interface OrderEmailItem {
  productName: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
}

export interface OrderConfirmationEmailData {
  orderNumber: string;
  customerName?: string | null;
  customerEmail: string;
  items: OrderEmailItem[];
  subtotal: number | string;
  shippingCost: number | string;
  discount?: number | string;
  total: number | string;
  paymentMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    state?: string | null;
    zip?: string | null;
    country: string;
  };
}

const EMAIL_WRAPPER_HEADER = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0D10; color: #F3F0E8; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <div style="background-color: #000; padding: 24px 20px; border-bottom: 2px solid #00D9FF; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #FFFFFF;">
        VIBE<span style="color: #00D9FF;">LOCK</span>
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.6);">
        Modern Dhaka Streetwear
      </p>
    </div>
    <div style="padding: 28px 24px;">
`;

const EMAIL_WRAPPER_FOOTER = `
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.6;">
        <p style="margin: 0;">VibeLock Bangladesh &bull; Official Order Confirmation</p>
        <p style="margin: 4px 0 0 0;">Customer Support: support@vibelock.bd &bull; WhatsApp: +8801311333277</p>
        <p style="margin: 4px 0 0 0;">Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh</p>
      </div>
    </div>
  </div>
`;

/**
 * Sends a rich, branded order confirmation email to the customer.
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationEmailData
): Promise<boolean> {
  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      console.warn(
        "⚠️ RESEND_API_KEY is not configured in production. Order confirmation email skipped for:",
        data.customerEmail
      );
    } else {
      console.log(
        `[Order Email Simulation] Confirmation email for order #${data.orderNumber} sent to ${data.customerEmail}`
      );
    }
    return true;
  }

  const name = data.customerName || "Valued Customer";
  const orderUrl = `${appConfig.url}/account/orders/${data.orderNumber}`;

  const itemsRows = data.items
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 12px 0;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #FFFFFF;">${item.productName}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.5);">
              ${item.size ? `Size: ${item.size}` : ""} ${item.color ? `&bull; Color: ${item.color}` : ""}
            </p>
          </td>
          <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.8);">
            x${item.quantity}
          </td>
          <td style="padding: 12px 0; text-align: right; font-size: 13px; font-weight: 600; color: #FFFFFF;">
            ৳ ${Number(item.lineTotal).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `
    )
    .join("");

  const htmlContent = `
    ${EMAIL_WRAPPER_HEADER}
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: rgba(0, 217, 255, 0.1); border: 1px solid #00D9FF; color: #00D9FF; padding: 4px 12px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px;">
          ORDER CONFIRMED
        </span>
        <h2 style="margin: 12px 0 4px 0; font-size: 20px; font-weight: 800; color: #FFFFFF;">
          Thanks for moving with us, ${name}!
        </h2>
        <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7);">
          We have received your order <strong style="color: #00D9FF;">#${data.orderNumber}</strong> and our team is preparing it for dispatch.
        </p>
      </div>

      <!-- Order Summary Card -->
      <div style="background-color: #12161A; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #00D9FF;">
          Itemized Summary
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Financial Breakdown -->
        <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: rgba(255,255,255,0.7);">
            <span>Subtotal</span>
            <span>৳ ${Number(data.subtotal).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
          ${
            data.discount && Number(data.discount) > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #00D9FF;">
              <span>Discount</span>
              <span>- ৳ ${Number(data.discount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
            </div>`
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; color: rgba(255,255,255,0.7);">
            <span>Delivery Fee</span>
            <span>৳ ${Number(data.shippingCost).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px; color: #FFFFFF;">
            <span>Total Payable</span>
            <span style="color: #00D9FF;">৳ ${Number(data.total).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <!-- Delivery & Payment Info -->
      <div style="background-color: #12161A; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #00D9FF;">
          Delivery &amp; Payment Details
        </h3>
        <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.5;">
          <strong>Shipping Address:</strong><br/>
          ${data.shippingAddress.street}, ${data.shippingAddress.city}, ${data.shippingAddress.country}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.8);">
          <strong>Payment Method:</strong> ${data.paymentMethod === "COD" ? "Cash on Delivery (COD)" : data.paymentMethod}
        </p>
      </div>

      <!-- Action Button -->
      <div style="text-align: center;">
        <a href="${orderUrl}" style="display: inline-block; background-color: #00D9FF; color: #000000; font-size: 12px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 28px; text-decoration: none; border-radius: 4px; box-shadow: 0 4px 14px rgba(0,217,255,0.4);">
          Track Order Details &rarr;
        </a>
      </div>
    ${EMAIL_WRAPPER_FOOTER}
  `;

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: data.customerEmail,
      subject: `Order Confirmed: #${data.orderNumber} | VibeLock`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error(
      `[Order Email] Failed to send order confirmation to ${data.customerEmail}:`,
      error
    );
    return false;
  }
}
