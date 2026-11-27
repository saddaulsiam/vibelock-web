import { headers } from "next/headers";
import { Header } from "@/components/storefront/layout/header";
import { Footer } from "@/components/storefront/layout/footer";
import { AnnouncementBar } from "@/components/storefront/layout/announcement-bar";
import { MetaPixelProvider } from "@/components/storefront/analytics/meta-pixel-provider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getGeneralStoreSettings } from "@/lib/settings/store-settings-service";
import { getShippingRulesSettings } from "@/lib/settings/shipping-rules-settings";
import { resolveEffectiveTrackingPixels } from "@/lib/settings/security-pixel-settings";
import { SlidersHorizontal } from "lucide-react";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const [user, { settings: generalSettings }, { settings: shippingSettings }, tracking] =
    await Promise.all([
      getCurrentUser(),
      getGeneralStoreSettings(),
      getShippingRulesSettings(),
      resolveEffectiveTrackingPixels(),
    ]);

  // Enforce Emergency Maintenance Mode
  if (generalSettings.maintenanceMode.enabled) {
    const isStaffOrAdmin =
      user && (user.role === "ADMIN" || user.role === "STAFF" || user.role === "MANAGER");
    if (!isStaffOrAdmin || !generalSettings.maintenanceMode.allowAdminBypass) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-vl-black p-6 text-center text-vl-white">
          <div className="border-vl-cyan/20 bg-vl-dark-900/80 max-w-lg rounded-2xl border p-8 shadow-2xl backdrop-blur-xl">
            <div className="bg-vl-cyan/10 text-vl-cyan mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
              <SlidersHorizontal className="size-7" />
            </div>
            <h1 className="font-heading text-2xl font-bold">{generalSettings.maintenanceMode.noticeTitle}</h1>
            <p className="text-vl-dark-300 mt-3 text-sm leading-relaxed">
              {generalSettings.maintenanceMode.noticeMessage}
            </p>
          </div>
        </div>
      );
    }
  }

  const isBypassingMaintenance =
    generalSettings.maintenanceMode.enabled && generalSettings.maintenanceMode.allowAdminBypass;

  const hasAnnouncement = Boolean(
    isBypassingMaintenance ||
      (generalSettings.holidayMode.enabled && generalSettings.holidayMode.bannerText) ||
      (shippingSettings.enableFreeShipping && shippingSettings.freeShippingBannerText)
  );

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col">
      <MetaPixelProvider
        nonce={nonce}
        pixelId={tracking.metaPixelId}
        gtmId={tracking.googleTagManagerId}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      <AnnouncementBar
        maintenanceBypass={isBypassingMaintenance}
        holidayBanner={generalSettings.holidayMode.enabled ? generalSettings.holidayMode.bannerText : null}
        shippingBanner={shippingSettings.enableFreeShipping ? shippingSettings.freeShippingBannerText : null}
      />

      <Header hasAnnouncement={hasAnnouncement} />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">{children}</main>
      <Footer />
      {/* <WhatsAppFloatingButton /> */}
      <ChatWidget
        initialUser={
          user
            ? {
                name: user.name,
                email: user.email,
              }
            : null
        }
      />
    </div>
  );
}
