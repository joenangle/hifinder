import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure we're NOT using static export (which breaks API routes)
  // output: 'export', // ❌ This would break API routes
  
  // Explicitly enable serverless functions for API routes
  experimental: {
    serverComponentsExternalPackages: []
  }
};

export default nextConfig;
