/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Fix for "Dynamic server usage" errors in API routes
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js']
  },
  // Force all API routes to be dynamic
  output: 'standalone',
};

module.exports = nextConfig; 