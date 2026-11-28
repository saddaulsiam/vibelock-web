"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function MetaPixelPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!PIXEL_ID || typeof window.fbq !== "function") return;
    // Track PageView on route changes
    window.fbq("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixelProvider({
  nonce,
  pixelId,
  gtmId,
}: {
  nonce?: string;
  pixelId?: string;
  gtmId?: string;
} = {}) {
  const activePixelId = pixelId?.trim() || PIXEL_ID;
  const activeGtmId = gtmId?.trim() || process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <>
      {activePixelId && (
        <>
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${activePixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
              alt=""
              aria-hidden="true"
            />
          </noscript>
          <Suspense fallback={null}>
            <MetaPixelPageViewTracker />
          </Suspense>
        </>
      )}

      {activeGtmId && (
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${activeGtmId}');
            `,
          }}
        />
      )}
    </>
  );
}
