import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/questoes", "/opinioes", "/privacidade", "/termos"],
        disallow: ["/api/", "/admin/", "/auditoria-figuras", "/auth/"],
      },
    ],
    sitemap: "https://lemmas.com.br/sitemap.xml",
  };
}
