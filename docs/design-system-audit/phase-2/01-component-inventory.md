# Phase 2 — 01: Complete Component Inventory & Adoption Matrix

> **Scope:** Comprehensive audit of all existing reusable components and raw HTML elements across Storefront, Customer Account, Admin Dashboard, and POS.  
> **Status:** READ-ONLY Architectural Analysis

---

## 1. Component Architecture Overview

VibeLock's component ecosystem consists of **140+ components** divided into four functional tiers:

1. **Central UI Primitives (`src/components/ui/`):** 13 base components built on Radix/Base-UI and Tailwind CSS v4.
2. **Shared Layout Elements (`src/components/shared/`):** 7 system-wide structural components (`Container`, `Section`, `SectionHeading`, `SubmitButton`, `PaymentGatewayBadge`, `VibeLockLoader`, `VibeLockLoaderDark`).
3. **Domain Feature Components (`src/components/{storefront,account,admin,pos}/`):** 120+ specialized domain widgets.
4. **Ad-Hoc Raw HTML Implementations:** 800+ raw `<button>`, `<input>`, `<textarea>`, `<select>`, and custom `<div>` tags directly inlined into page and card templates.

---

## 2. Component Adoption Matrix by Domain

| Component Category     | Central Primitive Available?   | Times Primitive Used | Times Raw HTML Used | Primitive Adoption Rate | Primary Reason for Bypassing Primitive                                                               |
| ---------------------- | ------------------------------ | -------------------- | ------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Buttons**            | Yes (`Button` in `button.tsx`) | **70**               | **471**             | **12.9%**               | `Button` default is `h-8` (32px), too small for mobile touch targets (44px–48px)                     |
| **Inputs**             | Yes (`Input` in `input.tsx`)   | **66**               | **216**             | **23.4%**               | `Input` default is `h-8` with `rounded-lg`, incompatible with `h-11 rounded-xs` checkout inputs      |
| **Textareas**          | **No** (Missing in `ui/`)      | **0**                | **28**              | **0.0%**                | No shared Textarea primitive exists in the repository                                                |
| **Selects**            | Yes (`Select` in `select.tsx`) | **18**               | **45**              | **28.5%**               | `@base-ui` Select is `w-fit h-8`, whereas checkout needs full-width `h-11` native district selector  |
| **Cards & Panels**     | Yes (`Card` in `card.tsx`)     | **14**               | **~150**            | **8.5%**                | `Card` forces `rounded-xl ring-1`, clashing with storefront `rounded-xs` subtle borders              |
| **Badges**             | Yes (`Badge` in `badge.tsx`)   | **90**               | **~120**            | **42.8%**               | `Badge` is pill-shaped (`rounded-4xl`), whereas sale & gateway badges are rectangular (`rounded-xs`) |
| **Tables**             | Yes (`Table` in `table.tsx`)   | **38**               | **4**               | **90.5%**               | **High adoption:** Admin data tables consistently use the central `Table` primitive                  |
| **Dialogs / Modals**   | Yes (`Dialog` in `dialog.tsx`) | **24**               | **2**               | **92.3%**               | **High adoption:** Admin and POS modals consistently use `Dialog`                                    |
| **Drawers / Sheets**   | Yes (`Sheet` in `sheet.tsx`)   | **16**               | **0**               | **100.0%**              | **Full adoption:** Mobile nav and filter sheets all use `Sheet`                                      |
| **Toaster / Feedback** | Yes (`Sonner` in `sonner.tsx`) | Mounted in layout    | —                   | **100.0%**              | All notifications use `toast.*` via `sonner`                                                         |

---

## 3. Inventory by Application Domain

### 3.1 Storefront Components (`src/components/storefront/`)

- **Catalog & Cards:** `ProductCard` (custom 2:3 aspect), `ProductGrid`, `Price`, `ProductBadge`, `ActiveFilters`, `ProductFilters`, `Pagination`, `PromoBanner`.
- **Checkout & Cart:** `CheckoutForm` (single-page express checkout), `CartPageContent`, `CartItemCard`.
- **Product Details:** `ImageGallery`, `VariantSelector`, `AddToCartButton`, `ProductReviewsSection`, `ProductReviewsSummary`, `ProductReviewList`, `StarRating`.
- **Navigation & Layout:** `Header`, `Footer`, `AnnouncementBar`, `DesktopNav`, `CategoriesDrawer`, `HeaderSearch`, `MobileSearch`, `SearchModal`, `AccountPopover`.
- **Orders & Returns:** `OrderConfirmationTracker`, `OrderStatusBadge`, `OrderPrintAction`, `CancelOrderButton`, `ReorderButton`, `ReturnForm`.

### 3.2 Customer Account Components (`src/components/account/`)

- **Dashboard Hub:** `AccountShell` (dot matrix background, underline tabs), `AccountHero`, `AccountMetrics`, `AccountRecentOrders`, `AccountQuickActions`, `AccountMembershipCard`.
- **Orders & Returns:** `OrdersInfiniteList`, `ReturnsInfiniteList`.
- **Profile & Security:** `ProfileHub`, `ProfileForm`, `AccountSecurityCard`, `NotificationPreferencesCard`.
- **Addresses & Vouchers:** `AddressList`, `AddressForm`, `AccountAddressesCard`, `CouponsView`.

### 3.3 Admin Operations Components (`src/components/admin/`)

- **Shared Operations Controls:** `AdminPageHeader`, `AdminNavigation` (collapsible sidebar), `AdminTableControls`, `AdminTableColumnVisibility`, `InfiniteScroll`, `AdminKpiCard`, `AdminSignOutButton`.
- **Products:** `AdminProductsTable`, `AdminProductsToolbar`, `ProductForm`, `ProductVariantGenerator`, `ProductProfitabilityDrilldown`, `ProductImageUploader`, `AdminProductQuickPriceModal`, `AdminProductBarcodeModal`, `AdminProductBulkBar`.
- **Orders:** `AdminOrdersTable`, `AdminOrdersDesktopTable`, `AdminOrdersMobileList`, `AdminOrdersToolbar`, `AdminOrdersBulkBar`, `OrderLifecycleStepper`, `OrderCustomerRiskCard`, `OrderPickPackChecklist`, `OrderThermalLabelModal`, `OrderPrintButton`.
- **Inventory:** `AdminInventoryTable`, `AdminInventoryDetail`, `AdminInventoryDetailLedger`, `AdminInventoryDetailKpi`, `AdminInventoryAdjustModal`, `AdminInventoryPoModal`, `AdminInventoryStocktakeModal`, `AdminInventoryBarcodeModal`, `AdminInventoryIntelligenceTable`.
- **Customers & CRM:** `AdminCustomersTable`, `CustomerRiskWidget`, `CustomerTimelineCard`, `CustomerStaffNotes`, `CustomerPreferencesCard`, `CustomerSmartCrmActions`, `CustomerAbandonedCartCard`.
- **Categories & Coupons:** `AdminCategoriesTable`, `CategoryForm`, `CategorySelect`, `CategoryMultiselect`, `AdminCouponsTable`, `CouponForm`, `CouponCreateModal`.
- **Shipping & Payments:** `AdminShipmentsTable`, `ShippingForms`, `ShippingSubNav`, `AdminPaymentsTable`, `PaymentSettingsForms`.

### 3.4 Retail POS Components (`src/components/pos/`)

- **Counter View:** `PosView`, `PosHeader`, `PosProductGrid`, `PosProductScanner`, `PosCartPanel`.
- **Checkout & Settlement:** `PosPaymentModal` (split tenders), `PosThermalReceipt`, `PosReturnReceipt`.
- **Register Operations:** `PosShiftModal`, `PosShiftZReport`, `PosOrdersModal`, `PosParkedModal`, `PosReturnModal`, `PosVariantPickerModal`.

---

## 4. Key Takeaway & Architecture Direction

The existing component tree is feature-complete and highly specialized. **The problem is not a lack of components, but a lack of size and variant flexibility in the base primitives.**

Rather than rewriting or replacing domain components, **Phase 2 must expand the central primitives (`Button`, `Input`, `Card`, `Badge`) to natively support the sizes and styles currently written with raw HTML classes.**
