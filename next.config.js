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
  // Move serverComponentsExternalPackages to serverExternalPackages at the root
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  // Remove from experimental
  experimental: {
    // (other experimental options can go here if needed)
  },
  // Remove standalone output for Vercel deployment
  // output: 'standalone', // This can cause asset loading issues on Vercel
  
  // Make sure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  // Ensure proper asset loading
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  
  // Configure images for production
  images: {
    domains: ['funny-kitchen.vercel.app', 'localhost'],
    unoptimized: false,
  },
  
  // Configure handling of specific API routes
  async headers() {
    return [
      {
        // Apply to API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
};

module.exports = nextConfig; 