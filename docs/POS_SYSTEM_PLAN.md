# VibeLock POS (Point of Sale) System — সম্পূর্ণ আর্কিটেকচার ও বাস্তবায়ন পরিকল্পনা

> **ডকুমেন্ট সংস্করণ:** ১.০ | **তারিখ:** ০১ নভেম্বর ২০২৬  
> **প্রজেক্ট:** VibeLock Web (Next.js App Router, Prisma ORM, PostgreSQL)  
> **উদ্দেশ্য:** VibeLock ফিজিক্যাল স্টোর/আউটলেটের কাউন্টার সেলস পরিচালনা এবং অনলাইন স্টোরফ্রন্টের সাথে রিয়েল-টাইম সেন্ট্রালাইজড ইনভেন্টরি সিঙ্ক।

---

## ১. ওভারভিউ ও আর্কিটেকচার প্রিন্সিপাল (Core Principles)

1. **একক ইনভেন্টরি লেজার (Unified Stock Ledger):**
   - ফিজিক্যাল স্টোরে পণ্য বিক্রি হওয়ামাত্রই অনলাইন স্টোরেও স্টক সাথে সাথে কমে যাবে। কোনো ডাবল সেলিং (Overselling) ঝুঁকি থাকবে না।
2. **ভূমিকা ও নিরাপত্তা (Role-Based Access):**
   - দোকানের সেলস স্টাফ/ক্যাশিয়ারদের জন্য `Role.STAFF` রোল থাকবে। তারা শুধুমাত্র ক্যাশ কাউন্টার ও ডেইলি রেজিস্টার দেখতে পারবে; অ্যাডমিন কনফিগারেশন, এপিআই কি বা পেমেন্ট সেটিংসে তাদের এক্সেস থাকবে না।
   - ম্যানেজার (`Role.MANAGER`) ও অ্যাডমিন (`Role.ADMIN`) স্টাফের সব কাজের পাশাপাশি ডিসকাউন্ট অনুমোদন ও ক্যাশ ড্রয়ার রিকনসিলিয়েশন করতে পারবে।
3. **অফলাইন/কাউন্টার স্পিড ও কীবোর্ড অপ্টিমাইজেশন:**
   - মাউস ছাড়াই দ্রুত বিলিংয়ের জন্য বারকোড স্ক্যানার এবং কীবোর্ড শর্টকাট (F1, F2, Enter, Esc) সাপোর্ট।

---

## ২. ডাটাবেজ ম্যাপিং ও স্কিমা অ্যালাইনমেন্ট

VibeLock-এর বিদ্যমান `prisma/schema.prisma`-তে কোনো ব্রেকিং পরিবর্তন ছাড়াই POS হ্যান্ডেল করা যাবে:

### `Order` মডেল ম্যাপিং:
| ফিল্ড | POS ভ্যালু | বিবরণ |
|---|---|---|
| `salesChannel` | `SalesChannel.POS` | অর্ডারের সোর্স চিহ্নিত করবে |
| `status` | `OrderStatus.DELIVERED` | দোকানে সরাসরি পণ্য হস্তান্তর হওয়ায় তাৎক্ষণিক ডেলিভার্ড |
| `paymentStatus` | `PaymentStatus.SUCCESS` | কাউন্টারে পেমেন্ট সম্পন্ন হওয়ামাত্রই সাকসেস |
| `customerEmail` | `pos-walkin@vibelock.bd` (বা কাস্টমারের রিয়েল ইমেইল) | ওয়াক-ইন কাস্টমারের ডিফল্ট ইমেইল |
| `customerName` | `"Walk-in Customer"` (বা কাস্টমারের নাম) | মেমোতে প্রদর্শনের জন্য |
| `customerPhone` | কাস্টমারের মোবাইল নম্বর (ঐচ্ছিক) | SMS মেমো ও লয়ালটি ট্র্যাকিংয়ের জন্য |
| `shippingMethodName` | `"In-Store Counter / Takeaway"` | শিপিং মেথড স্ন্যাপশট |
| `shippingCost` | `0.00` | দোকানে কোনো শিপিং চার্জ নেই |
| `shippingStreet` | `"Store Outlet Counter"` | ফিজিক্যাল স্টোর লোকেশন |
| `shippingCity` | `"Dhaka"` | স্টোর সিটি |

### `InventoryTransaction` ম্যাপিং:
- `type`: `SALE`
- `quantity`: `-qty` (নেগেটিভ স্টক কর্তন)
- `referenceId`: `order.id`
- `salesChannel`: `POS`
- `notes`: `"In-store counter purchase via POS"`

---

## ৩. রাউট ও ডিরেক্টরি স্ট্রাকচার (কেন `src/app/(protected)/pos/` সেরা?)

POS কোনো রোল নয়, এটি একটি সম্পূর্ণ স্বতন্ত্র **ফুল-স্ক্রিন বিজনেস ওয়ার্কস্পেস**। তাই এটি সরাসরি `src/app/(protected)/pos/`-এ থাকা সবচেয়ে ক্লিন ও স্ট্যান্ডার্ড:

```text
src/
├── app/
│   └── (protected)/
│       └── pos/
│           ├── layout.tsx                     # POS Auth Guard: requireRole("STAFF")
│           ├── page.tsx                       # মূল POS কাউন্টার ইন্টারফেস (URL: /pos)
│           ├── orders/                        # আজকের ও পূর্বের POS মেমো তালিকা (URL: /pos/orders)
│           │   └── page.tsx
│           └── receipt/
│               └── [orderNumber]/             # থার্মাল প্রিন্ট উপযোগী মেমো পেজ (URL: /pos/receipt/...)
│                   └── page.tsx
├── components/
│   └── pos/
│       ├── pos-header.tsx                     # ক্যাশিয়ার নাম, ব্রাঞ্চ, লাইভ ঘড়ি, ড্রয়ার স্ট্যাটাস
│       ├── pos-product-scanner.tsx            # বারকোড লিসেনার + ইনস্ট্যান্ট SKU সার্চ
│       ├── pos-category-filter.tsx            # টাচস্ক্রিনের জন্য ক্যাটাগরি পিলস
│       ├── pos-product-grid.tsx               # দ্রুত বিক্রিত পণ্যের গ্রিড ও স্টক ব্যাজ
│       ├── pos-cart-panel.tsx                 # ডানপাশের বিলিং প্যানেল (আইটেম, কোয়ান্টিটি, রেট)
│       ├── pos-customer-selector.tsx          # ওয়াক-ইন সুইচ অথবা ফোন নম্বর দিয়ে কাস্টমার সার্চ
│       ├── pos-discount-dialog.tsx            # ফ্ল্যাট বা পার্সেন্টেজ ডিসকাউন্ট / কুপন
│       ├── pos-payment-modal.tsx              # ক্যাশ/চেঞ্জ রিটার্ন, কার্ড, bKash QR পেমেন্ট মোডাল
│       └── pos-thermal-receipt.tsx            # 58mm / 80mm থার্মাল প্রিন্ট প্রিভিউ
└── lib/
    └── pos/
        ├── pos-actions.ts                     # createPosOrderAction, closeDailyRegisterAction
        ├── pos-queries.ts                     # getPosCatalog, searchByBarcodeOrSku, getDailyRegister
        └── pos-types.ts                       # PosCartItem, PosPaymentPayload, RegisterSummary
```

---

## ৪. ইউজার ইন্টারফেস (POS Counter UI Blueprint)

POS স্ক্রিনটি একটি ফুল-স্ক্রিন দুই-কলাম লেআউট হবে:

```
+---------------------------------------------------------------------------------------+
| VibeLock POS | Counter #1 | Cashier: Siam (Staff) | Today: ৳ 48,500 | [F4: Daily Register] |
+----------------------------------------------------+----------------------------------+
| [ Barcode / SKU / Product Name (Auto-focus)    🔍 ] | BILLING CART                     |
|                                                    | -------------------------------- |
| Categories: [All] [T-Shirts] [Shirts] [Pants]      | 1. Heavyweight Tee (L / Black)   |
|                                                    |    1 x ৳ 1,290.00         [ - 1 +] |
| +------------------------------------------------+ | 2. Oxford Shirt (M / White)      |
| | [Img] Essential Oversized Tee                 | |    2 x ৳ 1,590.00 = ৳ 3,180 [ - 2 +] |
| | SKU: VBL-TEE-BLK-L   Stock: 12                | | -------------------------------- |
| | ৳ 990.00                              [ ADD ]  | | Customer: [✓] Walk-in Customer   |
| +------------------------------------------------+ | Phone (Optional): [ 017xxxxxxxx ]|
| | [Img] Urban Heavyweight Tee                   | | -------------------------------- |
| | SKU: VBL-TEE-CHR-M   Stock: 8                 | | Subtotal:              ৳ 4,470.00 |
| | ৳ 1,290.00                            [ ADD ]  | | Discount:             - ৳   200.00 |
| +------------------------------------------------+ | Tax (0%):                 ৳     0.00 |
|                                                    | Total Payable:          ৳ 4,270.00 |
|                                                    | -------------------------------- |
|                                                    | [ F1: Clear ]  [ F2: Hold Cart ] |
|                                                    | [  PAY NOW (F9 / Space)   ৳4,270  ] |
+----------------------------------------------------+----------------------------------+
```

---

## ৫. পেমেন্ট মোডাল ও ক্যাশ চেঞ্জ ক্যালকুলেটর

গ্রাহক বিল পরিশোধের সময় তিনটি অপশন থাকবে:

1. **নগদ ক্যাশ (Cash):**
   - ক্যাশিয়ার কাস্টমারের দেওয়া টাকার পরিমাণ লিখবে (যেমন: ৫,০০০ টাকা)।
   - স্ক্রিনে স্বয়ংক্রিয়ভাবে দেখাবে: **"Change to Return: ৳ 730.00"** (ভুল হওয়ার সুযোগ নেই)।
2. **ডিজিটাল পেমেন্ট (Card / bKash / Nagad QR):**
   - কাউন্টারের মার্চেন্ট QR কোড স্ক্যান করে কাস্টমার টাকা পাঠালে ক্যাশিয়ার ট্রানজেকশন আইডির শেষ ৪ ডিজিট লিখে সাবমিট করবে।
3. **স্প্লিট পেমেন্ট (Split Payment):**
   - যেমন: ২,০০০ টাকা ক্যাশ + ২,২৭০ টাকা bKash।

---

## ৬. সার্ভার অ্যাকশন ও ইনভেন্টরি ট্রানজেকশন লজিক

### `createPosOrderAction` সিউডোকোড:
```typescript
"use server";

import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";

export async function createPosOrderAction(payload: PosOrderPayload) {
  const staff = await requireRole("STAFF");

  return await prisma.$transaction(async (tx) => {
    // ১. স্টক চেক এবং রো-লেভেল লক (Race Condition রোধে)
    const variantIds = payload.items.map((i) => i.variantId);
    await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;

    for (const item of payload.items) {
      const stock = await calculateAvailableStock(tx, item.variantId);
      if (stock < item.quantity) {
        throw new Error(`স্টক ঘাটতি: "${item.productName}" পর্যাপ্ত পরিমাণে নেই (বর্তমান স্টক: ${stock})`);
      }
    }

    // ২. অর্ডার তৈরি (POS চ্যানেল ও সরাসরি DELIVERED)
    const orderNumber = generatePosOrderNumber(); // যেমন: VBL-POS-20261101-0042
    const order = await tx.order.create({
      data: {
        orderNumber,
        salesChannel: "POS",
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: payload.paymentMethod, // COD বা ONLINE
        customerEmail: payload.customerEmail || "pos-walkin@vibelock.bd",
        customerName: payload.customerName || "Walk-in Customer",
        customerPhone: payload.customerPhone || null,
        subtotal: payload.subtotal,
        discount: payload.discount,
        taxAmount: 0,
        taxRate: 0,
        shippingCost: 0,
        total: payload.total,
        shippingStreet: "Store Outlet Counter",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "In-Store Purchase",
        items: {
          create: payload.items.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            size: item.size,
            color: item.color,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
        },
      },
    });

    // ৩. ইনভেন্টরি লেজার থেকে সরাসরি স্টক কর্তন
    await tx.inventoryTransaction.createMany({
      data: payload.items.map((item) => ({
        variantId: item.variantId,
        type: "SALE",
        quantity: -item.quantity,
        referenceId: order.id,
        salesChannel: "POS",
        notes: `POS Counter sale by ${staff.name || staff.email} (${orderNumber})`,
      })),
    });

    // ৪. ক্যাশ ড্রয়ার ট্র্যাকিং / অডিট লগ
    await tx.auditLog.create({
      data: {
        userId: staff.id,
        action: "POS_SALE_COMPLETED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          total: payload.total,
          paymentMethod: payload.paymentMethod,
          tendered: payload.tenderedAmount,
          change: payload.changeAmount,
        },
      },
    });

    // ৫. ক্যাশ রিভ্যালিডেশন যাতে অনলাইন স্টোরফ্রন্ট আপডেট হয়
    revalidatePath("/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/orders");

    return { success: true, orderNumber: order.orderNumber, orderId: order.id };
  });
}
```

---

## ৭. থার্মাল রিসিট প্রিন্ট (58mm / 80mm POS Slip)

ব্রাউজারের স্ট্যান্ডার্ড `window.print()` ব্যবহার করে CSS প্রিন্ট মিডিয়া কোয়েরির মাধ্যমে বিল প্রিন্ট হবে:

```css
@media print {
  body * {
    visibility: hidden;
  }
  #pos-receipt, #pos-receipt * {
    visibility: visible;
  }
  #pos-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm; /* অথবা 58mm রোল সাইজ */
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 2mm;
  }
}
```

**রিসিটে যা যা থাকবে:**
- VibeLock লোগো ও আউটলেট ঠিকানা
- মেমো নম্বর ও তারিখ-সময়
- ক্যাশিয়ারের নাম
- প্রতিটি আইটেমের নাম, সাইজ, পরিমাণ ও মূল্য
- সাবটোটাল, ডিসকাউন্ট ও মোট পরিশোধিত টাকা
- ক্যাশ পেইড ও ফেরত দেওয়া খুচরা (Change)
- নিচে বারকোড ও শুভেচ্ছা বার্তা: *"Thank you for moving with VibeLock!"*

---

## ৮. বাস্তবায়ন পরিকল্পনা (Step-by-Step Implementation Roadmap)

| ধাপ | কাজ | সময়সীমা |
|---|---|---|
| **ফেজ ১** | `src/lib/pos/` — কুয়েরি, টাইপস এবং `createPosOrderAction` তৈরি | ১ দিন |
| **ফেজ ২** | `src/app/(protected)/pos/` — বারকোড স্ক্যানার, প্রোডাক্ট গ্রিড ও কার্ট UI | ১-২ দিন |
| **ফেজ ৩** | পেমেন্ট মোডাল (ক্যাশ, চেঞ্জ ক্যালকুলেটর, bKash) ও ফর্ম ভ্যালিডেশন | ১ দিন |
| **ফেজ ৪** | থার্মাল রিসিট প্রিন্ট টেমপ্লেট (`@media print`) ও পপ-আপ অটো-প্রিন্ট | হাফ দিন |
| **ফেজ ৫** | দিনশেষে ক্যাশ ড্রয়ার ও ডেইলি সেলস রিপোর্ট (`/pos/orders`) | ১ দিন |
| **ফেজ ৬** | কিবোর্ড শর্টকাট টেস্ট, বারকোড স্ক্যানার টেস্ট ও ইনভেন্টরি সিঙ্ক ভেরিফিকেশন | হাফ দিন |

---

> **নোট:** এই প্ল্যানটি সম্পূর্ণ স্বয়ংসম্পূর্ণ। আপনি পরবর্তীতে যখনই POS নিয়ে কাজ শুরু করতে চাইবেন, এই ডকুমেন্টের ধাপগুলো ধরে ধারাবাহিকভাবে কোড ইমপ্লিমেন্ট করা যাবে।

