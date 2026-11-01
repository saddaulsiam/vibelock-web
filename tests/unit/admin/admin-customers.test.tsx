import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminCustomersTable,
  CustomerAbandonedCartCard,
  CustomerCreateModal,
  CustomerEditModal,
  CustomerPreferencesCard,
  CustomerReviewsCard,
  CustomerRiskWidget,
  CustomerSecurityCard,
  CustomerSmartCrmActions,
  CustomerStaffNotes,
  CustomerTimelineCard,
} from "@/components/admin/customers";
import type {
  AdminCustomerListItem,
  AdminCustomerPreferences,
  AdminCustomerAbandonedCart,
  AdminCustomerReviewItem,
  AdminCustomerTimelineEvent,
} from "@/lib/admin/customers";
import type { CombinedCustomerRiskProfile } from "@/lib/admin/customers";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/customers",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Customers Module Unit Tests", () => {
  const sampleCustomers: AdminCustomerListItem[] = [
    {
      id: "cust-1",
      name: "Saddaul Siam",
      email: "siam@example.com",
      phone: "01711111111",
      createdAt: new Date("2026-01-15T10:00:00Z"),
      orderCount: 4,
      paidOrderValue: 12500,
      latestOrderDate: new Date("2026-10-25T12:00:00Z"),
      latestOrderStatus: "DELIVERED",
      latestOrderNumber: "VL-20261025-0001",
      tier: "VIP",
    },
    {
      id: "cust-2",
      name: "Rahim Chowdhury",
      email: "rahim@example.com",
      phone: "01822222222",
      createdAt: new Date("2026-02-20T10:00:00Z"),
      orderCount: 2,
      paidOrderValue: 4200,
      latestOrderDate: new Date("2026-10-20T12:00:00Z"),
      latestOrderStatus: "CONFIRMED",
      latestOrderNumber: "VL-20261020-0002",
      tier: "REPEAT",
    },
    {
      id: "cust-3",
      name: "Karim Ahmed",
      email: "karim@example.com",
      phone: "01933333333",
      createdAt: new Date("2026-03-01T10:00:00Z"),
      orderCount: 1,
      paidOrderValue: 1500,
      latestOrderDate: new Date("2026-10-10T12:00:00Z"),
      latestOrderStatus: "PENDING",
      latestOrderNumber: "VL-20261010-0003",
      tier: "SINGLE",
    },
    {
      id: "cust-4",
      name: null,
      email: "lead@example.com",
      phone: null,
      createdAt: new Date("2026-04-01T10:00:00Z"),
      orderCount: 0,
      paidOrderValue: 0,
      latestOrderDate: null,
      latestOrderStatus: null,
      latestOrderNumber: null,
      tier: "LEAD",
    },
  ];

  const sampleCounts = {
    ALL: 4,
    REPEAT: 2,
    SINGLE: 1,
    LEADS: 1,
  };

  test("renders all customer segment tabs with exact counts", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("All Customers");
    expect(html).toContain("(4)");
    expect(html).toContain("Repeat / VIP");
    expect(html).toContain("(2)");
    expect(html).toContain("First-Time");
    expect(html).toContain("(1)");
    expect(html).toContain("Leads (0 Orders)");
  });

  test("renders customer rows with name, email, phone, and tier badges", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("Saddaul Siam");
    expect(html).toContain("siam@example.com");
    expect(html).toContain("01711111111");
    expect(html).toContain("VIP Buyer");

    expect(html).toContain("Rahim Chowdhury");
    expect(html).toContain("Repeat Buyer");

    expect(html).toContain("Karim Ahmed");
    expect(html).toContain("1 Order");

    expect(html).toContain("lead@example.com");
    expect(html).toContain("Lead");
  });

  test("renders empty state gracefully when no customers match filter", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={[]}
        total={0}
        totalPages={1}
        currentPage={1}
        currentSearch="unknown customer"
        segmentCounts={{ ALL: 0, REPEAT: 0, SINGLE: 0, LEADS: 0 }}
      />
    );

    expect(html).toContain("No customers found");
    expect(html).toContain("unknown customer");
  });

  test("renders mobile touch cards with call and WhatsApp quick links", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("tel:01711111111");
    expect(html).toContain("wa.me/8801711111111");
  });

  test("renders AdminTableInfiniteScroll with all loaded state when loaded equals total", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("customers loaded");
    expect(html).toContain("All <strong");
  });

  test("renders AdminTableInfiniteScroll load more button when hasMore is true", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={10}
        totalPages={3}
        currentPage={1}
        segmentCounts={{ ALL: 10, REPEAT: 4, SINGLE: 3, LEADS: 3 }}
      />
    );

    expect(html).toContain("Load more customers");
    expect(html).toContain("Showing 4 of 10");
  });

  test("renders search input with / shortcut and unified h-10 toolbar buttons", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    // Verify search input with / shortcut
    expect(html).toContain("press / to focus");

    // Verify all 4 toolbar controls
    expect(html).toContain("Sort: Newest Joined");
    expect(html).toContain("Columns");
    expect(html).toContain("Customize visible columns");
    expect(html).toContain("Export CSV");
    expect(html).toContain("Add Customer");

    // Verify unified h-10 sizing class
    expect(html).toContain("h-10");
  });

  test("CustomerRiskWidget renders Steadfast courier stats and COD control", () => {
    const sampleProfile: CombinedCustomerRiskProfile = {
      phone: "01711111111",
      email: "siam@example.com",
      riskScore: "LOW_RISK",
      riskLabel: "Trusted / Verified Buyer",
      headline: "Repeat Loyal Buyer (4 delivered orders on VibeLock)",
      recommendation:
        "Reliable buyer with proven delivery track record. Safe for 1-click confirmation.",
      confidenceBadge: "VERIFIED",
      storeStats: {
        totalOrders: 4,
        deliveredOrders: 4,
        cancelledOrders: 0,
        pendingOrders: 0,
        totalSpent: 12500,
        isRepeatCustomer: true,
      },
      steadfastStats: {
        success: true,
        phone: "01711111111",
        totalParcels: 15,
        totalDelivered: 14,
        totalCancelled: 1,
        deliveryRatio: 93.3,
        cancellationRatio: 6.7,
        fraudReportsCount: 0,
        riskLevel: "LOW",
      },
      checkedAt: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      <CustomerRiskWidget
        initialProfile={sampleProfile}
        customerPhone="01711111111"
        customerId="cust-1"
        isCodBlocked={false}
      />
    );

    expect(html).toContain("Courier Risk Assessment");
    expect(html).toContain("LOW RISK");
    expect(html).toContain("93.3% Success Rate");
    expect(html).toContain("15"); // total parcels
    expect(html).toContain("14"); // delivered parcels
    expect(html).toContain("Cash on Delivery (COD) Privilege");
    expect(html).toContain("ALLOWED");
    expect(html).toContain("Restrict COD Orders");
  });

  test("CustomerPreferencesCard renders sizing insights, top products, and cadence", () => {
    const preferences: AdminCustomerPreferences = {
      preferredSize: "L",
      topSizes: [
        { size: "L", count: 5 },
        { size: "XL", count: 2 },
      ],
      topProducts: [{ name: "Acid Wash Heavyweight Hoodie", quantity: 3 }],
      preferredChannel: "WEBSITE",
      preferredPayment: "COD",
      daysSinceLastOrder: 4,
    };

    const html = renderToStaticMarkup(<CustomerPreferencesCard preferences={preferences} />);

    expect(html).toContain("Shopping Preferences &amp; Insights");
    expect(html).toContain("Most Bought: Size L");
    expect(html).toContain("Size L");
    expect(html).toContain("(5x)");
    expect(html).toContain("Acid Wash Heavyweight Hoodie");
    expect(html).toContain("3 qty");
    expect(html).toContain("4 days ago");
    expect(html).toContain("Active Buyer");
  });

  test("CustomerStaffNotes renders empty state and notes list", () => {
    const htmlEmpty = renderToStaticMarkup(<CustomerStaffNotes customerId="cust-1" notes={[]} />);
    expect(htmlEmpty).toContain("Internal Staff Notes");
    expect(htmlEmpty).toContain("No internal staff notes yet");

    const sampleNotes = [
      {
        id: "note-1",
        note: "Customer requested delivery after 5 PM and prefers loose fit.",
        authorName: "Tanvir Manager",
        createdAt: new Date(),
      },
    ];

    const htmlFilled = renderToStaticMarkup(
      <CustomerStaffNotes customerId="cust-1" notes={sampleNotes} />
    );
    expect(htmlFilled).toContain("Tanvir Manager");
    expect(htmlFilled).toContain("Customer requested delivery after 5 PM");
  });

  test("CustomerSmartCrmActions renders WhatsApp action button", () => {
    const customer = {
      id: "cust-1",
      name: "Saddaul Siam",
      phone: "01711111111",
      email: "siam@example.com",
      preferredSize: "L",
      totalOrders: 4,
      totalSpent: 12500,
    };

    const html = renderToStaticMarkup(<CustomerSmartCrmActions customer={customer} />);

    expect(html).toContain("WhatsApp");
    expect(html).toContain("wa.me/8801711111111");
  });

  test("CustomerCreateModal renders input fields when open", () => {
    const html = renderToStaticMarkup(<CustomerCreateModal isOpen={true} onClose={vi.fn()} />);
    expect(html).toContain("Add New Customer");
    expect(html).toContain("Customer Name");
    expect(html).toContain("Phone Number");
    expect(html).toContain("Create Customer");
  });

  test("CustomerEditModal renders customer pre-filled values when open", () => {
    const html = renderToStaticMarkup(
      <CustomerEditModal
        isOpen={true}
        onClose={vi.fn()}
        customer={{
          id: "cust-1",
          name: "Saddaul Siam",
          email: "siam@example.com",
          phone: "01711111111",
          addresses: [
            {
              id: "addr-1",
              label: "Primary",
              street: "Road 4, Sector 7",
              city: "Dhaka",
              state: "Dhaka",
              zip: "1230",
              country: "Bangladesh",
              isDefault: true,
            },
          ],
        }}
      />
    );
    expect(html).toContain("Edit Customer Profile");
    expect(html).toContain("Saddaul Siam");
    expect(html).toContain("siam@example.com");
    expect(html).toContain("Road 4, Sector 7");
  });

  test("CustomerSecurityCard blocks permanent deletion and shows Protected status when orderCount > 0", () => {
    const html = renderToStaticMarkup(
      <CustomerSecurityCard
        customerId="cust-1"
        customerName="Saddaul Siam"
        customerEmail="siam@example.com"
        orderCount={4}
        isAccountSuspended={false}
      />
    );

    expect(html).toContain("Account Security &amp; Administrative Controls");
    expect(html).toContain("Password Assistance");
    expect(html).toContain("Send Reset Email");
    expect(html).toContain("Copy WhatsApp Reset Link");
    expect(html).toContain("ACTIVE");
    expect(html).toContain("PROTECTED (4)");
    expect(html).toContain("Delete Blocked (Has Orders)");
  });

  test("CustomerSecurityCard permits deletion when orderCount === 0 and displays suspended status", () => {
    const html = renderToStaticMarkup(
      <CustomerSecurityCard
        customerId="cust-4"
        customerName="Lead Customer"
        customerEmail="lead@example.com"
        orderCount={0}
        isAccountSuspended={true}
        suspensionReason="Spam activity"
      />
    );

    expect(html).toContain("SUSPENDED");
    expect(html).toContain("0 ORDERS (SAFE)");
    expect(html).toContain("Delete Customer Profile");
    expect(html).toContain("Reactivate Account");
  });

  test("CustomerAbandonedCartCard displays active items and WhatsApp recovery action", () => {
    const sampleCart: AdminCustomerAbandonedCart = {
      hasCart: true,
      updatedAt: new Date("2026-10-27T14:30:00Z"),
      totalItems: 2,
      subtotal: 3900,
      items: [
        {
          id: "ci-1",
          productId: "prod-1",
          productName: "Vintage Acid Wash Oversized Hoodie",
          productSlug: "vintage-acid-wash-oversized-hoodie",
          variantId: "var-1",
          sku: "VL-HD-ACID-L",
          size: "L",
          color: "Acid Black",
          price: 2500,
          quantity: 1,
          imageUrl: "/test.jpg",
        },
        {
          id: "ci-2",
          productId: "prod-2",
          productName: "Cyberpunk Heavyweight Tee",
          productSlug: "cyberpunk-heavyweight-tee",
          variantId: "var-2",
          sku: "VL-TEE-CYBER-M",
          size: "M",
          color: "Washed Olive",
          price: 1400,
          quantity: 1,
          imageUrl: null,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <CustomerAbandonedCartCard
        cart={sampleCart}
        customerPhone="01711111111"
        customerName="Saddaul Siam"
      />
    );

    expect(html).toContain("Abandoned Cart");
    expect(html).toContain("Vintage Acid Wash Oversized Hoodie");
    expect(html).toContain("Cyberpunk Heavyweight Tee");
    expect(html).toContain("Size: L");
    expect(html).toContain("Size: M");
    expect(html).toContain("2 pcs");
    expect(html).toContain("৳3,900");
    expect(html).toContain("Send WhatsApp Recovery");
  });

  test("CustomerAbandonedCartCard renders clean empty state when cart is empty", () => {
    const emptyCart: AdminCustomerAbandonedCart = {
      hasCart: false,
      updatedAt: null,
      totalItems: 0,
      subtotal: 0,
      items: [],
    };

    const html = renderToStaticMarkup(
      <CustomerAbandonedCartCard
        cart={emptyCart}
        customerPhone="01711111111"
        customerName="Saddaul Siam"
      />
    );

    expect(html).toContain("Active Shopping Cart");
    expect(html).toContain("Cart Empty");
  });

  test("CustomerReviewsCard renders customer ratings, verified badge, and comments", () => {
    const sampleReviews: AdminCustomerReviewItem[] = [
      {
        id: "rev-1",
        productId: "prod-1",
        productName: "Drop Shoulder Boxy Tee",
        productSlug: "drop-shoulder-boxy-tee",
        productImageUrl: "/tee.jpg",
        rating: 5,
        comment: "Outstanding 280 GSM heavyweight cotton. Fits perfect!",
        verified: true,
        createdAt: new Date("2026-10-20T10:00:00Z"),
      },
      {
        id: "rev-2",
        productId: "prod-2",
        productName: "Cargo Utility Pants",
        productSlug: "cargo-utility-pants",
        productImageUrl: null,
        rating: 4,
        comment: "Great quality zipper and fit, fast shipping in Dhaka.",
        verified: false,
        createdAt: new Date("2026-09-15T15:00:00Z"),
      },
    ];

    const html = renderToStaticMarkup(<CustomerReviewsCard reviews={sampleReviews} />);

    expect(html).toContain("Product Reviews &amp; Feedback");
    expect(html).toContain("⭐ 4.5 / 5.0");
    expect(html).toContain("Drop Shoulder Boxy Tee");
    expect(html).toContain("Cargo Utility Pants");
    expect(html).toContain("Outstanding 280 GSM heavyweight cotton. Fits perfect!");
    expect(html).toContain("Verified Purchase");
    expect(html).toContain("2 Reviews");
  });

  test("CustomerReviewsCard renders empty state when customer has no reviews", () => {
    const html = renderToStaticMarkup(<CustomerReviewsCard reviews={[]} />);

    expect(html).toContain("Product Reviews &amp; Ratings");
    expect(html).toContain("0 Reviews");
    expect(html).toContain("This customer has not submitted any product reviews or ratings yet.");
  });

  test("CustomerTimelineCard renders unified event nodes, filters, and descriptions", () => {
    const sampleTimeline: AdminCustomerTimelineEvent[] = [
      {
        id: "ev-1",
        type: "ORDER_PLACED",
        title: "Placed Order #VL-20261027-001",
        description: "Total: ৳3,450 • 2 item(s) • COD",
        timestamp: new Date("2026-10-27T12:00:00Z"),
        badge: "DELIVERED",
        badgeVariant: "success",
        link: "/admin/orders/ord-1",
        linkLabel: "View Order",
      },
      {
        id: "ev-2",
        type: "STAFF_NOTE",
        title: "Staff Note by Support Agent",
        description: "Customer requested oversized fit advice on WhatsApp",
        timestamp: new Date("2026-10-26T15:30:00Z"),
        badge: "WhatsApp Note",
        badgeVariant: "default",
        actorName: "Support Agent",
      },
      {
        id: "ev-3",
        type: "COD_RESTRICTED",
        title: "COD Privilege Restricted",
        description: "High return rate from Steadfast courier",
        timestamp: new Date("2026-10-25T11:00:00Z"),
        badge: "COD Blocked",
        badgeVariant: "destructive",
        actorName: "Store Manager",
      },
      {
        id: "ev-4",
        type: "ACCOUNT_CREATED",
        title: "Account Registered",
        description: "Customer joined VibeLock store",
        timestamp: new Date("2026-01-10T09:00:00Z"),
        badge: "Registration",
        badgeVariant: "info",
      },
    ];

    const html = renderToStaticMarkup(<CustomerTimelineCard timeline={sampleTimeline} />);

    expect(html).toContain("Unified 360° Activity Timeline");
    expect(html).toContain("Placed Order #VL-20261027-001");
    expect(html).toContain("Staff Note by Support Agent");
    expect(html).toContain("COD Privilege Restricted");
    expect(html).toContain("Account Registered");
    expect(html).toContain("DELIVERED");
    expect(html).toContain("COD Blocked");
    expect(html).toContain("By Support Agent");
    expect(html).toContain("View Order");
  });

  test("CustomerTimelineCard renders empty state when no events exist", () => {
    const html = renderToStaticMarkup(<CustomerTimelineCard timeline={[]} />);

    expect(html).toContain("Unified 360° Activity Timeline");
    expect(html).toContain("Total 0 Events");
    expect(html).toContain("No activity records found in this category.");
  });
});
