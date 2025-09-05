import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure we're NOT using static export (which breaks API routes)
  // output: 'export', // ❌ This would break API routes
  
  // External packages for server components
  serverExternalPackages: []
};

export default nextConfig;
