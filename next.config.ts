import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure we're NOT using static export (which breaks API routes)
  // output: 'export', // ❌ This would break API routes

  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,

  // Explicit gzip compression (default true, but being explicit for audit tools)
  compress: true,

  // External packages for server components (scripts-only dependencies)
  serverExternalPackages: ['jsdom'],

  // React Compiler for automatic memoization (Next.js 16+)
  reactCompiler: true,

  // Skip TypeScript checking during `next build` — tsc runs separately
  // via the build script for faster builds with incremental caching
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'framer-motion',
    ],
  },

  // Allow external images from Google and other providers
  images: {
    minimumCacheTTL: 3600, // Cache images for 1 hour (default changed to 4 hours in Next.js 16)
    formats: ['image/webp', 'image/avif'], // Modern image formats for better performance
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'moondroplab.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dqvuvieggqltkznluvol.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Redirects for consolidated dashboard
  async redirects() {
    return [
      {
        source: '/dashboard-new',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/alerts',
        destination: '/dashboard?tab=alerts',
        permanent: true,
      },
      {
        source: '/wishlist',
        destination: '/dashboard?tab=wishlist',
        permanent: true,
      },
      {
        source: '/why',
        destination: '/about',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
