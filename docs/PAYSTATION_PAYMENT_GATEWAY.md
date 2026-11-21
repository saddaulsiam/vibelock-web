# PayStation Payment Gateway Integration Guide

This document outlines the architecture, configuration, security practices, and operational procedures for the **PayStation Hosted Checkout** gateway integration in VibeLock (`saddaulsiam/vibelock-web`).

---

## 1. Overview & Architecture

PayStation is a licensed Payment System Operator (PSO) in Bangladesh providing multi-channel online checkout (Cards, MFS like bKash, Nagad, Rocket, Upay, and Internet Banking).

### Architectural Model
- **Checkout Flow**: Hosted Checkout redirect. When customer initiates checkout with PayStation, VibeLock issues `POST /initiate-payment` (`application/x-www-form-urlencoded`) and redirects the user to the verified secure `payment_url`.
- **Payment Lifecycle Alignment**:
  - `Order.paymentMethod`: Stored as `ONLINE` in the database, preserving compatibility with existing database enums and analytics.
  - `Payment.gateway`: Recorded as `"PAYSTATION"`.
  - `Payment.merchantReferenceId`: Immutable, unique merchant invoice reference (`PS-${orderNumber}-${timestamp}`).
  - `Payment.gatewayTransactionId`: Gateway transaction reference (`trx_id`).
- **Zero-Trust Settlement**: Browser redirects to `callback_url` and incoming webhook hits to `ipn_url` are treated as untrusted hints. State changes to `SUCCESS` or inventory settlement require an authoritative server-to-server query via **PayStation Transaction Status v1** (`POST /transaction-status`).

---

## 2. Environment Variables

All PayStation credentials are strictly server-only and validated by `src/lib/config/env.ts`. They are never leaked to client bundles.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PAYSTATION_MERCHANT_ID` | `string` | *(None)* | PayStation Merchant Identifier issued upon merchant onboarding. |
| `PAYSTATION_PASSWORD` | `string` | *(None)* | Merchant API password used for payment initiation. |
| `PAYSTATION_SANDBOX` | `boolean` | `true` | `true` for sandbox (`https://sandbox.paystation.com.bd`), `false` for production (`https://api.paystation.com.bd`). |

> [!IMPORTANT]
> **Production & Preview Deployment**:
> Configure these variables securely in Vercel Project Settings > Environment Variables for Production and Preview environments. Do not commit real credentials into Git.

---

## 3. Endpoints & URLs

### Gateway Base URLs
- **Sandbox Base**: `https://sandbox.paystation.com.bd`
- **Production Base**: `https://api.paystation.com.bd`

### Initiation Endpoint
- `POST /initiate-payment`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Payload Parameters**:
  - `merchantId`: `PAYSTATION_MERCHANT_ID`
  - `password`: `PAYSTATION_PASSWORD`
  - `invoice_number`: Unique invoice string (`PS-${orderNumber}-${timestamp}`)
  - `currency`: `BDT`
  - `payment_amount`: Integer total amount in BDT
  - `pay_with_charge`: `"0"` (0 = Merchant absorbs charges; 1 = Customer pays charges)
  - `cust_name`: Customer full name
  - `cust_phone`: Customer phone number
  - `cust_email`: Customer email
  - `callback_url`: `https://<DOMAIN>/api/payments/paystation/callback`
  - `cust_address`: Shipping address
  - `reference`: VibeLock order number

### Verification Endpoint (Transaction Status v1)
- `POST /transaction-status`
- **Headers**: `merchantId: <PAYSTATION_MERCHANT_ID>`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Body**: `invoice_number=<INVOICE_NUMBER>`

### VibeLock Public Webhook & Callback Routes
- **Browser Callback URL**:
  `https://<YOUR_APP_DOMAIN>/api/payments/paystation/callback`
- **Instant Payment Notification (IPN) Webhook URL**:
  `https://<YOUR_APP_DOMAIN>/api/payments/paystation/ipn`

---

## 4. Merchant Portal Configuration

1. Log in to the PayStation Merchant Portal (Sandbox or Production).
2. Navigate to **Integration Settings** / **API Credentials**.
3. Obtain your `Merchant ID` and `Password`.
4. Register the **IPN Webhook URL**:
   `https://<YOUR_APP_DOMAIN>/api/payments/paystation/ipn`
5. Ensure the IPN listener is active and HTTPS is enforced.

---

## 5. Security & Idempotency Safeguards

1. **Integer Amount Enforcement**:
   PayStation documents `payment_amount` strictly as an integer. VibeLock strictly verifies `Number.isInteger(amount)` before initiation and rejects fractional BDT amounts cleanly without silent rounding.
2. **Server-to-Server Verification**:
   No payment is marked paid, nor are inventory reservations committed to sales, without a successful response from `POST /transaction-status` matching the expected invoice, amount, and currency.
3. **Idempotency & Replay Protection**:
   Both `/callback` and `/ipn` deduplicate duplicate gateway notifications:
   - If a payment is already in `SUCCESS` and the transaction ID matches, VibeLock acknowledges with HTTP 200 without executing duplicate balance or inventory mutations.
   - Concurrent callbacks serialize cleanly on database row locks.
4. **Credential Gating**:
   PayStation cannot be enabled in `/admin/settings/payments` or selected during checkout unless `PAYSTATION_MERCHANT_ID` and `PAYSTATION_PASSWORD` are present and trimmed in environment variables.

---

## 6. Testing Checklist

- [ ] **Initiation Success**: Verify redirection to valid `sandbox.paystation.com.bd` checkout URL.
- [ ] **Missing Credentials**: Verify error is thrown and checkout falls back gracefully.
- [ ] **Fractional Amount**: Verify order with fractional cents is rejected safely without rounding.
- [ ] **Invalid Payment URL**: Hostnames not matching `*.paystation.com.bd` or non-HTTPS URLs are rejected.
- [ ] **Server Verification**: Simulated success status transitions order to `CONFIRMED` and payment to `SUCCESS`.
- [ ] **Amount Mismatch**: Gateway reporting an amount different from order total triggers security alert and fails payment.
- [ ] **Invoice Mismatch**: Status verification with mismatched invoice reference is rejected.
- [ ] **Duplicate Callback / IPN**: Subsequent identical requests return HTTP 200 without duplicate inventory adjustments.
- [ ] **Concurrent Callback / IPN**: Simultaneous requests do not cause race conditions or duplicate capture records.
- [ ] **Admin Toggle**: Disabling PayStation removes it from storefront options instantly; in-flight verifications still settle safely.

---

## 7. Deployment Checklist

- [ ] Ensure `PAYSTATION_MERCHANT_ID` and `PAYSTATION_PASSWORD` are added to Vercel production environment variables.
- [ ] Set `PAYSTATION_SANDBOX=false` in production.
- [ ] Verify that `NEXT_PUBLIC_APP_URL` matches the production domain.
- [ ] Register `https://<YOUR_DOMAIN>/api/payments/paystation/ipn` in PayStation portal.
- [ ] Perform an end-to-end sandbox or live test with minimal amount (e.g. 10 BDT).
- [ ] Enable PayStation via Admin Settings (`/admin/settings/payments`).

---

## 8. Known API Ambiguities Requiring PayStation Confirmation

1. **Integer vs Decimal Amounts**:
   PayStation documentation specifies `payment_amount` as integer. If VibeLock adopts fractional pricing or coupon discounts creating cents in the future, merchant support must confirm whether PayStation accepts float/decimal amounts (e.g., `500.50`) or requires paisa conversion.
2. **IPN Payload Format**:
   PayStation documentation outlines JSON body for IPN, but some legacy integrations submit `application/x-www-form-urlencoded`. VibeLock's `/api/payments/paystation/ipn` route is implemented defensively to accept both formats while enforcing the 64 KB request boundary.
3. **IPN Webhook Authentication**:
   PayStation does not currently supply HMAC signature headers (e.g., `x-paystation-signature`). Therefore, VibeLock always queries `POST /transaction-status` server-to-server to establish authentic transaction legitimacy.
