# 01 — Project Coverage Audit

> **Objective:** Document and classify every active page, layout, and component namespace in the repository.

---

## 1. Executive Coverage Overview

The VibeLock application is structured around the **Next.js App Router** with route groups separating distinct application contexts. A total of **72 unique page routes** were identified and audited across four functional zones:

```
src/app/
├── (auth)/          → 5 Customer Authentication Routes
├── (protected)/
│   ├── account/     → 8 Customer Self-Service & Order History Routes
│   ├── admin/       → 36 E-commerce Administration & Operations Routes
│   ├── manager/     → 1 Management Portal Route
│   ├── staff/       → 1 Store Staff Portal Route
│   └── pos/         → 1 Physical Retail Point of Sale (POS) Route
├── (storefront)/    → 19 Public Marketing, Catalog & Checkout Routes
└── unauthorized/    → 1 Universal Security Access Denied Route
```

---

## 2. Area A: Storefront Routes (19 Pages)

The storefront operates primarily with a light warm aesthetic (`#F2F2F2` / `#F3F0E8` canvas with `#101114` ink and `#00D9FF` cyber accents), shifting to dark accents in the header and footer.

| Route URL | File Path | Layout / Shell | Key Visual Elements |
|---|---|---|---|
| `/` | `src/app/(storefront)/page.tsx` | Root Storefront Shell | Hero banner, marquee ticker, best sellers, collection grid, newsletter |
| `/shop` | `src/app/(storefront)/shop/page.tsx` | Storefront Shell | Catalog header, product grid, sticky filter sheet, active filter tags |
| `/products` | `src/app/(storefront)/products/page.tsx` | Storefront Shell | Full inventory listing with infinite scroll & pagination fallback |
| `/product/[slug]` | `src/app/(storefront)/product/[slug]/page.tsx` | Storefront Shell | 2:3 aspect image gallery, sticky variant selector, size guide, reviews |
| `/category/[slug]` | `src/app/(storefront)/category/[slug]/page.tsx` | Storefront Shell | Category title banner, curated product feed, subcategory filters |
| `/search` | `src/app/(storefront)/search/page.tsx` | Storefront Shell | Instant search bar, query highlighting, empty search recommendation cards |
| `/cart` | `src/app/(storefront)/cart/page.tsx` | Storefront Shell | Order item cards, quantity stepper, coupon input, delivery cost preview |
| `/checkout` | `src/app/(storefront)/checkout/page.tsx` | Dedicated Checkout Layout | 4-field express delivery form, zero-click shipping, SSLCOMMERZ / COD switch |
| `/order-success/[orderNumber]` | `src/app/(storefront)/order-success/[orderNumber]/page.tsx` | Post-Purchase Canvas | Order confirmation badge, tracking stepper, order summary slip, print trigger |
| `/wishlist` | `src/app/(storefront)/wishlist/page.tsx` | Storefront Shell | LocalStorage/server synced saved items, remove action, quick-cart button |
| `/about` | `src/app/(storefront)/about/page.tsx` | Editorial Text Layout | Brand manifesto, Dhaka youth streetwear ethos, manufacturing values |
| `/contact` | `src/app/(storefront)/contact/page.tsx` | Editorial Split Layout | Contact form, retail store address (Chatmohar, Pabna), WhatsApp trigger |
| `/faq` | `src/app/(storefront)/faq/page.tsx` | Accordion Layout | Categorized FAQ accordions (orders, sizing, delivery, returns) |
| `/privacy` | `src/app/(storefront)/privacy/page.tsx` | Legal Document Shell | Plain text legal policy with typographic hierarchy |
| `/privacy-policy` | `src/app/(storefront)/privacy-policy/page.tsx` | Legal Document Shell | Alias/redirect fallback to privacy policy |
| `/return-policy` | `src/app/(storefront)/return-policy/page.tsx` | Legal Document Shell | Return eligibility table, 7-day policy details, exchange flow instructions |
| `/shipping-policy` | `src/app/(storefront)/shipping-policy/page.tsx` | Legal Document Shell | Inside Dhaka vs Outside Dhaka rates, Steadfast courier SLA details |
| `/terms` | `src/app/(storefront)/terms/page.tsx` | Legal Document Shell | Terms of service and consumer agreement |
| `/unauthorized` | `src/app/unauthorized/page.tsx` | Universal Error Shell | Access denied alert with back-to-home navigation pill |

---

## 3. Area B: Customer Authentication & Account (13 Pages)

The authentication experience uses an editorial split-screen dark canvas (`#0C0D10` / `#101114`), while the customer account hub uses a light dot-matrix canvas with an underline tab bar.

### B.1 Authentication (5 Pages)
| Route URL | File Path | Layout Type | Key Visual Elements |
|---|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | 50/50 Split Desktop / Mobile Banner | Photography hero, Email/Password vs Phone OTP switcher, cyan glow button |
| `/register` | `src/app/(auth)/register/page.tsx` | 50/50 Split Desktop / Mobile Banner | Customer registration form, password strength meter, terms checkbox |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Centered Dark Card | Email reset instruction request, confirmation state |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Centered Dark Card | Tokenized password reset form with match validation |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Centered Dark Card | Email verification token validator, resend countdown timer |

### B.2 Customer Account Portal (8 Pages)
| Route URL | File Path | Shell Used | Key Visual Elements |
|---|---|---|---|
| `/account` | `src/app/(protected)/account/page.tsx` | `AccountShell` | Membership tier card, quick metrics, recent orders summary, dot grid |
| `/account/profile` | `src/app/(protected)/account/profile/page.tsx` | `AccountShell` | Profile form, phone verification status, password change modal |
| `/account/orders` | `src/app/(protected)/account/orders/page.tsx` | `AccountShell` | Infinite scroll orders list, payment badges, fulfillment status pills |
| `/account/orders/[orderNumber]` | `src/app/(protected)/account/orders/[orderNumber]/page.tsx` | `AccountShell` | Detailed order timeline, courier tracking ID, item breakdown, invoice |
| `/account/orders/[orderNumber]/return` | `src/app/(protected)/account/orders/[orderNumber]/return/page.tsx` | `AccountShell` | Item return selector, return reason radio list, image proof uploader |
| `/account/returns` | `src/app/(protected)/account/returns/page.tsx` | `AccountShell` | Return requests tracking list, refund status badges |
| `/account/returns/[id]` | `src/app/(protected)/account/returns/[id]/page.tsx` | `AccountShell` | Return inspection status, QC feedback, payout information |
| `/account/coupons` | `src/app/(protected)/account/coupons/page.tsx` | `AccountShell` | Available discount vouchers, copy coupon code chip, expiry indicator |

---

## 4. Area C: Admin Dashboard & POS Operations (39 Pages)

The administrative suite uses a high-density operations UI featuring a dark obsidian collapsible sidebar (`#101114`), a light off-white workspace canvas (`#F3F0E8`), and high-contrast tables.

### C.1 Operations & Administration (36 Pages)
| Module | Route URL | File Path | Primary Components |
|---|---|---|---|
| **Overview** | `/admin` | `src/app/(protected)/admin/page.tsx` | KPI cards, real-time revenue graph, order stream, inventory alerts |
| **Products** | `/admin/products` | `src/app/(protected)/admin/products/page.tsx` | Data table, column visibility toggle, bulk price modal, barcode generator |
| **New Product** | `/admin/products/new` | `src/app/(protected)/admin/products/new/page.tsx` | Variant matrix generator, Cloudinary uploader, live preview card |
| **Edit Product** | `/admin/products/[id]/edit` | `src/app/(protected)/admin/products/[id]/edit/page.tsx` | Tabbed product editor, profitability drilldown, SKU ledger |
| **Orders** | `/admin/orders` | `src/app/(protected)/admin/orders/page.tsx` | Filter toolbar, status tabs, bulk print thermal slips, courier assign |
| **Order Detail** | `/admin/orders/[id]` | `src/app/(protected)/admin/orders/[id]/page.tsx` | Stepper, customer fraud risk widget, WhatsApp direct link, invoice generator |
| **Inventory** | `/admin/inventory` | `src/app/(protected)/admin/inventory/page.tsx` | Stock ledger table, low-stock filter, stocktake modal, PO modal |
| **Variant Detail** | `/admin/inventory/[variantId]` | `src/app/(protected)/admin/inventory/[variantId]/page.tsx` | Audit ledger history, manual stock adjustment form, reserve release |
| **Inventory Intel** | `/admin/inventory-intelligence` | `src/app/(protected)/admin/inventory-intelligence/page.tsx` | Runout date projection, stockout probability, restock suggestions |
| **Customers** | `/admin/customers` | `src/app/(protected)/admin/customers/page.tsx` | Customer table, total spend, return rate score, order count |
| **Customer Detail** | `/admin/customers/[id]` | `src/app/(protected)/admin/customers/[id]/page.tsx` | Smart CRM actions, COD risk rating, order history, address records |
| **Categories** | `/admin/categories` | `src/app/(protected)/admin/categories/page.tsx` | Category hierarchy table, product count, sort order |
| **New Category** | `/admin/categories/new` | `src/app/(protected)/admin/categories/new/page.tsx` | Category creator with slug generator |
| **Category Detail** | `/admin/categories/[id]` | `src/app/(protected)/admin/categories/[id]/page.tsx` | Product association manager |
| **Edit Category** | `/admin/categories/[id]/edit`| `src/app/(protected)/admin/categories/[id]/edit/page.tsx` | Category details and metadata editor |
| **Coupons** | `/admin/coupons` | `src/app/(protected)/admin/coupons/page.tsx` | Coupon table, percentage/fixed toggles, usage limits |
| **New Coupon** | `/admin/coupons/new` | `src/app/(protected)/admin/coupons/new/page.tsx` | Voucher creator form |
| **Edit Coupon** | `/admin/coupons/[id]/edit` | `src/app/(protected)/admin/coupons/[id]/edit/page.tsx` | Voucher rules, minimum spend, expiry date picker |
| **Returns** | `/admin/returns` | `src/app/(protected)/admin/returns/page.tsx` | RMA table, QC status, customer return proofs |
| **Return Detail** | `/admin/returns/[id]` | `src/app/(protected)/admin/returns/[id]/page.tsx` | Inspection action form, refund approval, stock return selector |
| **Reviews** | `/admin/reviews` | `src/app/(protected)/admin/reviews/page.tsx` | Customer product reviews table, approval toggle, star ratings |
| **Banners** | `/admin/banners` | `src/app/(protected)/admin/banners/page.tsx` | Storefront marketing banner list, scheduling toggles |
| **New Banner** | `/admin/banners/new` | `src/app/(protected)/admin/banners/new/page.tsx` | Banner image uploader, mobile/desktop aspect ratio preview |
| **Edit Banner** | `/admin/banners/[id]/edit` | `src/app/(protected)/admin/banners/[id]/edit/page.tsx` | Banner position and CTA link editor |
| **Shipping** | `/admin/shipping` | `src/app/(protected)/admin/shipping/page.tsx` | Shipping zones and active rate management |
| **Shipping Methods**| `/admin/shipping/methods` | `src/app/(protected)/admin/shipping/methods/page.tsx` | Delivery rate tiers (Standard vs Express) |
| **New Method** | `/admin/shipping/methods/new` | `.../shipping/methods/new/page.tsx` | Courier fee configuration form |
| **Edit Method** | `/admin/shipping/methods/[id]/edit` | `.../shipping/methods/[id]/edit/page.tsx` | Courier fee editor |
| **Shipping Zones** | `/admin/shipping/zones` | `src/app/(protected)/admin/shipping/zones/page.tsx` | Geographical zone list (Inside Dhaka, Outside Dhaka) |
| **New Zone** | `/admin/shipping/zones/new` | `.../shipping/zones/new/page.tsx` | District selector and zone builder |
| **Edit Zone** | `/admin/shipping/zones/[id]/edit` | `.../shipping/zones/[id]/edit/page.tsx` | District association editor |
| **Payments** | `/admin/payments` | `src/app/(protected)/admin/payments/page.tsx` | Gateway transaction logs, SSLCOMMERZ / bKash / Nagad records |
| **Reports** | `/admin/reports` | `src/app/(protected)/admin/reports/page.tsx` | Sales revenue chart, COGS, gross margin, export CSV |
| **Reconciliation**| `/admin/reports/reconciliation` | `.../reports/reconciliation/page.tsx` | Gateway settlement vs bank vs Steadfast courier ledger |
| **Admins/Staff** | `/admin/admins` | `src/app/(protected)/admin/admins/page.tsx` | Role-based access control table (ADMIN, MANAGER, STAFF) |
| **Settings** | `/admin/settings` | `src/app/(protected)/admin/settings/page.tsx` | General store settings, currency, notification preferences |
| **Settings / Pay**| `/admin/settings/payments`| `.../settings/payments/page.tsx` | Gateway credentials status (SSLCOMMERZ, bKash, Nagad) |

### C.2 Retail POS & Dedicated Roles (3 Pages)
| Role / Module | Route URL | File Path | Key Features |
|---|---|---|---|
| **Point of Sale** | `/pos` | `src/app/(protected)/pos/page.tsx` | Touch product catalog, barcode scanner, cart drawer, split payments, thermal receipts |
| **Manager Portal** | `/manager` | `src/app/(protected)/manager/page.tsx` | Mid-level operational dashboard (shifts, inventory approval) |
| **Staff Portal** | `/staff` | `src/app/(protected)/staff/page.tsx` | Order packing terminal and retail register view |

---

## 5. Shared Component Inventory

Across the application, components are organized under `src/components/`:
- `src/components/ui/` (13 shadcn base primitives): `button`, `input`, `badge`, `card`, `dialog`, `dropdown-menu`, `label`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `table`.
- `src/components/shared/` (7 core layout items): `Container`, `Section`, `SectionHeading`, `SubmitButton`, `PaymentGatewayBadge`, `VibeLockLoader`, `VibeLockLoaderDark`.
- Domain-specific directories: `storefront/` (40+ components), `account/` (15+ components), `admin/` (65+ components), and `pos/` (14 components).

---

## 6. Project Coverage Conclusion

1. **Breadth:** The application has a rich, fully populated feature set with zero stub pages. Every route has a working implementation.
2. **Visual Consistency Splitting:** There is an architectural dichotomy between:
   - **Storefront & POS:** Brutalist, angular, compact (`rounded-xs`, sharp corners, high tracking uppercase, heavy typography).
   - **Admin & Auth:** Softer, standard SaaS aesthetic (`rounded-lg`, `rounded-xl`, neutral cards).
3. **Dead Files:** No orphaned or dead page routes were detected in `src/app/`.

