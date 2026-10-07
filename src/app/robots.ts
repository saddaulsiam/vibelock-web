import { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/public-env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/checkout/", "/cart/", "/api/", "/admin/", "/manager/", "/staff/"],
    },
    sitemap: `${publicEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
