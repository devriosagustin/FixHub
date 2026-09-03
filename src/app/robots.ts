import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fixhub.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/chat/", "/profesional/perfil"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
