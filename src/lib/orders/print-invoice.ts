export interface PrintableOrderItem {
  id?: string;
  productName: string;
  sku?: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PrintableOrder {
  orderNumber: string;
  createdAt: Date | string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentGateway?: string | null;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  taxAmount?: number;
  total: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
  shippingMethodName?: string | null;
  items: PrintableOrderItem[];
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPaymentMethod(method: string, gateway?: string | null): string {
  if (method === "COD" || gateway === "COD" || gateway === "CASH") {
    return "Cash on Delivery";
  }
  if (gateway === "BKASH" || method === "BKASH") return "bKash";
  if (gateway === "NAGAD" || method === "NAGAD") return "Nagad";
  if (gateway === "SSLCOMMERZ") return "Card / MFS (SSLCommerz)";
  if (method === "ONLINE") return "Online Payment";
  return method || "Cash on Delivery";
}

function formatStatus(status: string): string {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "RETURN_REQUESTED":
      return "Return Requested";
    case "RETURNED":
      return "Returned";
    default:
      return status;
  }
}

export function printCustomerInvoice(order: PrintableOrder): void {
  if (typeof window === "undefined") return;

  // Cleanup any old print iframe if present
  const oldIframe = document.getElementById("vibelock-order-print-iframe");
  if (oldIframe && oldIframe.parentNode) {
    oldIframe.parentNode.removeChild(oldIframe);
  }

  const iframe = document.createElement("iframe");
  iframe.id = "vibelock-order-print-iframe";
  iframe.setAttribute(
    "style",
    "position:fixed;top:-10000px;left:-10000px;width:1024px;height:1400px;border:0;opacity:0;pointer-events:none;z-index:-1;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const orderDate = new Date(order.createdAt);
  const formattedOrderDate = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(orderDate);

  const currentTimestamp = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());

  const isCOD =
    order.paymentMethod === "COD" ||
    order.paymentGateway === "COD" ||
    order.paymentGateway === "CASH";

  const isPaid =
    order.paymentStatus === "SUCCESS" ||
    order.paymentStatus === "PAID" ||
    (!isCOD && order.status !== "PENDING" && order.status !== "CANCELLED");

  const itemsHtml = order.items
    .map((item) => {
      const sizeColorParts = [];
      if (item.size) sizeColorParts.push(item.size);
      if (item.color) sizeColorParts.push(item.color);
      const sizeColorText = sizeColorParts.length > 0 ? sizeColorParts.join(" / ") : "Standard";

      return `
        <tr>
          <td class="col-item">
            <div class="item-name">${escapeHtml(item.productName)}</div>
            ${item.sku ? `<div class="item-sku">SKU: ${escapeHtml(item.sku)}</div>` : ""}
          </td>
          <td class="col-size">${escapeHtml(sizeColorText)}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">Tk ${item.unitPrice.toLocaleString("en-BD")}</td>
          <td class="col-total">Tk ${item.lineTotal.toLocaleString("en-BD")}</td>
        </tr>
      `;
    })
    .join("");

  const addressLines = [
    order.shippingStreet ? `<div class="addr-line">${escapeHtml(order.shippingStreet)}</div>` : "",
    order.shippingCity
      ? `<div class="addr-line">${escapeHtml(order.shippingCity)}${
          order.shippingState ? `, ${escapeHtml(order.shippingState)}` : ""
        }${order.shippingZip ? ` - ${escapeHtml(order.shippingZip)}` : ""}</div>`
      : "",
    order.shippingCountry
      ? `<div class="addr-line">${escapeHtml(order.shippingCountry)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const calloutBox = isCOD
    ? `
      <div class="callout-box cod">
        <div class="callout-title">Tk 300 advance payment confirms this order.</div>
        <div class="callout-text">
          Our team will call/WhatsApp you at 01942565664 to arrange it before shipping.
        </div>
      </div>
    `
    : isPaid
      ? `
      <div class="callout-box paid">
        <div class="callout-title">Payment Confirmed & Verified.</div>
        <div class="callout-text">
          Your order has been paid in full and is being prepared for dispatch.
        </div>
      </div>
    `
      : "";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Order Receipt #${escapeHtml(order.orderNumber)} - VibeLock BD</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #101114 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-sheet {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
          }

          /* Header Section */
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .brand-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo-circle {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #101114;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #00D9FF;
          }
          .brand-logo-text {
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .brand-name {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: #101114;
            line-height: 1.1;
          }
          .brand-tagline {
            font-size: 11px;
            color: #6b7280;
            margin-top: 3px;
          }

          .header-right {
            text-align: right;
          }
          .receipt-pill-title {
            color: #00bcd4;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .order-number {
            font-size: 20px;
            font-weight: 800;
            color: #101114;
            margin-top: 2px;
          }
          .order-timestamp {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }

          /* Cyan Horizontal Accent Bar */
          .cyan-divider {
            height: 2.5px;
            background: #00D9FF;
            margin: 14px 0 22px 0;
            border-radius: 2px;
          }

          /* Two-Column Meta Grid */
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-bottom: 24px;
          }
          .meta-col-title {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 6px;
          }
          .customer-name {
            font-size: 14px;
            font-weight: 800;
            color: #101114;
            text-transform: uppercase;
          }
          .customer-phone {
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            margin-top: 2px;
          }
          .addr-line {
            font-size: 11.5px;
            color: #4b5563;
            margin-top: 1.5px;
          }

          .meta-info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-info-table td {
            padding: 2.5px 0;
            font-size: 12px;
          }
          .meta-label {
            color: #6b7280;
            width: 40%;
          }
          .meta-value {
            color: #101114;
            font-weight: 600;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          .items-table thead tr {
            background: #E8F9FA !important;
            border-top: 1px solid #d1fae5;
            border-bottom: 1px solid #bbf7d0;
          }
          .items-table th {
            padding: 9px 12px;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #101114;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            vertical-align: middle;
          }
          .col-item {
            text-align: left;
            width: 44%;
          }
          .item-name {
            font-size: 12.5px;
            font-weight: 600;
            color: #101114;
          }
          .item-sku {
            font-size: 10.5px;
            color: #6b7280;
            margin-top: 2px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .col-size {
            text-align: left;
            width: 16%;
            color: #4b5563;
            font-size: 12px;
          }
          .col-qty {
            text-align: center;
            width: 10%;
            font-weight: 600;
            color: #101114;
          }
          .col-price {
            text-align: right;
            width: 15%;
            color: #4b5563;
          }
          .col-total {
            text-align: right;
            width: 15%;
            font-weight: 700;
            color: #101114;
          }

          /* Summary Box */
          .summary-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
          }
          .summary-table {
            width: 290px;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 4px 0;
            font-size: 12px;
          }
          .summary-table .amount {
            text-align: right;
            font-weight: 600;
            color: #101114;
          }
          .summary-table .total-line td {
            padding-top: 10px;
            font-size: 16px;
            font-weight: 800;
            border-top: 2px solid #101114;
            color: #101114;
          }

          /* Advance Payment Callout Box */
          .callout-box {
            margin-top: 26px;
            padding: 13px 18px;
            border-radius: 4px;
          }
          .callout-box.cod {
            background: #FFF9ED !important;
            border-left: 4px solid #F59E0B;
          }
          .callout-box.cod .callout-title {
            font-size: 12px;
            font-weight: 700;
            color: #B45309;
          }
          .callout-box.cod .callout-text {
            font-size: 11px;
            color: #92400E;
            margin-top: 2.5px;
            line-height: 1.4;
          }
          .callout-box.paid {
            background: #F0FDF4 !important;
            border-left: 4px solid #10B981;
          }
          .callout-box.paid .callout-title {
            font-size: 12px;
            font-weight: 700;
            color: #047857;
          }
          .callout-box.paid .callout-text {
            font-size: 11px;
            color: #065F46;
            margin-top: 2.5px;
          }

          /* Footer Policies & Locations */
          .footer-section {
            margin-top: 36px;
            border-top: 1px solid #e5e7eb;
            padding-top: 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .footer-block-title {
            font-size: 10.5px;
            font-weight: 800;
            color: #6b7280;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .footer-block-body {
            font-size: 10.5px;
            color: #4b5563;
            line-height: 1.5;
          }
          .footer-block-body strong {
            color: #101114;
          }

          /* Generation Note */
          .generation-note {
            margin-top: 22px;
            font-size: 9.5px;
            color: #9ca3af;
            text-align: center;
            border-top: 1px dashed #e5e7eb;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-sheet">
          <!-- 1. Brand Header -->
          <div class="header-row">
            <div class="brand-left">
              <div class="brand-logo-circle">
                <span class="brand-logo-text">VIBELOCK</span>
              </div>
              <div>
                <h1 class="brand-name">VIBELOCK BD</h1>
                <p class="brand-tagline">Premium Streetwear &middot; Bangladesh</p>
              </div>
            </div>

            <div class="header-right">
              <div class="receipt-pill-title">ORDER RECEIPT</div>
              <div class="order-number">#${escapeHtml(order.orderNumber)}</div>
              <div class="order-timestamp">${escapeHtml(formattedOrderDate)}</div>
            </div>
          </div>

          <!-- 2. Cyan Horizontal Accent Bar -->
          <div class="cyan-divider"></div>

          <!-- 3. Two-Column Metadata Grid -->
          <div class="meta-grid">
            <div>
              <div class="meta-col-title">DELIVERED TO</div>
              <div class="customer-name">${escapeHtml(order.customerName || "Valued Customer")}</div>
              ${
                order.customerPhone
                  ? `<div class="customer-phone">${escapeHtml(order.customerPhone)}</div>`
                  : ""
              }
              ${addressLines}
            </div>

            <div>
              <div class="meta-col-title">ORDER INFO</div>
              <table class="meta-info-table">
                <tr>
                  <td class="meta-label">Status</td>
                  <td class="meta-value">${escapeHtml(formatStatus(order.status))}</td>
                </tr>
                <tr>
                  <td class="meta-label">Payment method</td>
                  <td class="meta-value">${escapeHtml(
                    formatPaymentMethod(order.paymentMethod, order.paymentGateway)
                  )}</td>
                </tr>
                <tr>
                  <td class="meta-label">Placed via</td>
                  <td class="meta-value">VibeLock Website</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 4. Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-item">ITEM</th>
                <th class="col-size">SIZE</th>
                <th class="col-qty">QTY</th>
                <th class="col-price">PRICE</th>
                <th class="col-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- 5. Financial Summary -->
          <div class="summary-wrap">
            <table class="summary-table">
              <tr>
                <td>Subtotal</td>
                <td class="amount">Tk ${order.subtotal.toLocaleString("en-BD")}</td>
              </tr>
              ${
                order.discount && order.discount > 0
                  ? `
                <tr>
                  <td style="color: #059669;">Discount</td>
                  <td class="amount" style="color: #059669;">-Tk ${order.discount.toLocaleString(
                    "en-BD"
                  )}</td>
                </tr>
              `
                  : ""
              }
              <tr>
                <td>Shipping</td>
                <td class="amount">Tk ${order.shippingCost.toLocaleString("en-BD")}</td>
              </tr>
              <tr class="total-line">
                <td>TOTAL (${isCOD ? "COD" : "PAID"})</td>
                <td class="amount">Tk ${order.total.toLocaleString("en-BD")}</td>
              </tr>
            </table>
          </div>

          <!-- 6. Advance Confirmation Callout Notice -->
          ${calloutBox}

          <!-- 7. Support & Visit Our Stores -->
          <div class="footer-section">
            <div>
              <div class="footer-block-title">SUPPORT &amp; RETURNS</div>
              <p class="footer-block-body">
                WhatsApp us at <strong>01311-333277</strong> for order support, sizing help, or an exchange/return within 72 hours of delivery. Full terms: vibelock.com/policies/terms-of-service
              </p>
            </div>

            <div>
              <div class="footer-block-title">VISIT OUR STORE</div>
              <p class="footer-block-body">
                <strong>Chatmohar</strong> &mdash; Khondokar Market, Star More, Chatmohar, Pabna<br />
              </p>
            </div>
          </div>

          <!-- 8. Generation Timestamp Note -->
          <div class="generation-note">
            Thank you for shopping with VibeLock. Computer-generated receipt for order #${escapeHtml(
              order.orderNumber
            )} &mdash; generated ${escapeHtml(currentTimestamp)}.
          </div>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Brief tick to ensure DOM parsing and fonts load before opening print window
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[printCustomerInvoice] Print error:", e);
    }

    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}
