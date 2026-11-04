import type { MetadataRoute } from "next"

const publicPaths = ["/", "/pricing", "/about", "/contact", "/terms", "/privacy", "/data-deletion", "/login", "/signup"]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  return publicPaths.map((path) => ({
    url: new URL(path, baseUrl).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }))
}