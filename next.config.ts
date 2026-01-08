import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Ensure we're NOT using static export (which breaks API routes)
  // output: 'export', // ❌ This would break API routes

  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,

  // External packages for server components (scripts-only dependencies)
  serverExternalPackages: ['puppeteer-core', 'jsdom', 'xlsx'],

  // React Compiler for automatic memoization (Next.js 16+)
  reactCompiler: true,

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'lodash',
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
    ],
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

export default withBundleAnalyzer(nextConfig);
