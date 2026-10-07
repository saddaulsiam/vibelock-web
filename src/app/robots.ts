import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/checkout/", "/cart/", "/api/", "/admin/", "/manager/", "/staff/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
