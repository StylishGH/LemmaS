import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lemmas.com.br";
  const lastModified = new Date();

  return [
    { url: `${baseUrl}/landing`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/questoes`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/resolver`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/opinioes`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacidade`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/termos`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
