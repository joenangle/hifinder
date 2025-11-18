import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure we're NOT using static export (which breaks API routes)
  // output: 'export', // ❌ This would break API routes

  // Disable source maps in production for faster builds
  productionBrowserSourceMaps: false,

  // External packages for server components
  serverExternalPackages: [],

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Allow external images from Google and other providers
  images: {
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
