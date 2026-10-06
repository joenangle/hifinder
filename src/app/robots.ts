import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in pages carry noindex metadata; API and admin are never content
      disallow: ['/api/', '/admin'],
    },
    sitemap: 'https://hifinder.app/sitemap.xml',
  }
}
