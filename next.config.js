/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  // Ensure we're not using both mjs and js config files
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig; 