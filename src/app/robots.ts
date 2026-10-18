import type { MetadataRoute } from "next";

/** Only the public pages may be crawled. Worker links and signed-in screens stay out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/login", "/privacy", "/terms"],
      disallow: ["/w/", "/api/", "/today", "/calendar", "/hisaab", "/workers", "/inbox", "/settings", "/onboarding", "/auth/"],
    },
  };
}
