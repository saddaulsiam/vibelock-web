# 08 — Responsive Architecture & Viewport Consistency Audit

> **Objective:** Audit responsive breakpoint usage, layout adaptation across mobile, tablet, and desktop viewports, touch ergonomics, and print media rules.

---

## 1. Breakpoint Distribution & Philosophy

VibeLock strictly follows a **mobile-first progressive enhancement philosophy**. Media queries and breakpoint prefixes in Tailwind are almost exclusively min-width:

```
sm:      (min-width:  640px) : 1,225 occurrences  ████████████████████ (76.3%)
lg:      (min-width: 1024px) :   240 occurrences  ████ (15.0%)
md:      (min-width:  768px) :    99 occurrences  ██ (6.2%)
xl:      (min-width: 1280px) :    36 occurrences  █ (2.2%)
2xl:     (min-width: 1536px) :     4 occurrences  (0.2%)
8xl:     (min-width: 1440px) :     1 occurrence   (0.1%)
max-*:   (max-width queries) :     0 occurrences in Tailwind classes
```

### Key Observation: The Two-Tier Jump
Notice the dramatic step from `sm:` (1,225x) to `lg:` (240x), with `md:` having only 99 uses. 
- In VibeLock, **`sm:` (640px) is the primary layout divider**: it converts 1-column mobile forms into 2-column forms, 2-column product grids into 3- or 4-column grids, and expands compact text into desktop sizes.
- **`lg:` (1024px) is the structural layout divider**: it activates the desktop admin sidebar (`hidden lg:flex`), splits the auth screen (`lg:grid-cols-2`), and pins the sticky checkout summary sidebar (`lg:sticky lg:top-24`).
- Tablets (`md:`) are treated primarily as large mobile devices, ensuring tablet shoppers get touch-optimized mobile drawers and sticky action bars.

---

## 2. Cross-Viewport Layout Adaptation

### 2.1 Storefront Floating Header
- **Mobile (<640px):**  
  - Padding: `px-2.5 top-2`
  - Logo: Compact emblem (22px) with text hidden on narrow screens or truncated.
  - Search: Hidden pill; displays a circular search icon button triggering `<SearchModal>`.
  - Navigation: Desktop nav links hidden; accessed via bottom `<CategoriesDrawer>` button.
- **Desktop (>=1024px):**  
  - Floating pill centered with `max-w-6xl mx-auto`.
  - Instant search expands to interactive shortcut pill (`Press ⌘K or / to search`).
  - Full horizontal category link list.

### 2.2 Storefront Checkout Form
- **Mobile (<1024px):**  
  - Single continuous scroll flow: Delivery details → Payment selection → Coupon code → Order summary.
  - Sticky primary button (`min-h-12 w-full`) placed within easy thumb reach.
- **Desktop (>=1024px):**  
  - Two-column asymmetrical grid:
    ```tsx
    className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12"
    ```
  - Sticky right sidebar keeps cart contents and totals visible while customer enters delivery information.

### 2.3 Customer Authentication
- **Mobile (<1024px):**  
  - Compact photographic header banner (`h-44 sm:h-56 w-full object-[center_25%]`).
  - Form rendered beneath banner with 100% width.
- **Desktop (>=1024px):**  
  - 50/50 split-screen (`grid lg:grid-cols-2`).
  - Left column: Full-height editorial photography with dark gradient fade.
  - Right column: Centered authentication card with generous padding (`p-12 xl:p-16`).

### 2.4 Administrative Operations
- **Mobile (<1024px):**  
  - Sidebar hidden (`hidden lg:flex`).
  - Header displays hamburger trigger opening `<AdminMobileNavigation>` sheet.
  - Data tables switch from tabular view to stacked mobile card view (`AdminOrdersMobileList`, `AdminCouponsMobileList`).
- **Desktop (>=1024px):**  
  - Full data table with horizontal scrolling, column visibility toggles, and sticky action column.
  - Collapsible sidebar (`w-18` vs `w-64`).

---

## 3. Viewport Edge-Case & Overflow Audit

### 3.1 Narrow Mobile Screens (320px–360px: iPhone SE, Galaxy A-series)
- **Storefront Product Grid:** Operates as a 2-column grid on mobile (`grid-cols-2`). On 320px screens, each card is ~140px wide. Text sizes (`text-[13px]` title, `text-[10px]` category) prevent text wrapping overflow.
- **Checkout Form:** Single-column layout scales down without horizontal overflow.

### 3.2 Ultra-Wide Displays (1920px–2560px)
- **Storefront:** Centered via `<Container>` with `max-w-360` (1440px) and auto margins (`mx-auto`).
- **Admin Dashboard:** Expands up to `max-w-[100rem]` (1600px) to maximize table visibility on 27-inch and 32-inch monitor setups.

---

## 4. Print Media Architecture (`@media print`)

In `src/app/globals.css:233-312`, VibeLock includes a dedicated thermal receipt print engine:
```css
@media print {
  @page { margin: 0; size: auto; }
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  header, nav, main, footer, aside, [data-sonner-toaster] {
    display: none !important;
  }
  .print-area {
    position: fixed !important;
    width: 72mm !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
  }
}
```

### Assessment:
The print stylesheet safely resets dialog overlays and standardizes slip output to **72mm** (compatible with 58mm and 80mm thermal receipt printers used in Bangladesh retail counters).

