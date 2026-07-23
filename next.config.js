/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/indexer-api/:path*',
        destination: 'http://localhost:4000/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude undici from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
      };
    }
    return config;
  },
  // Disable webpack 5 cache to avoid chunk loading issues
  experimental: {
    webpackBuildWorker: false,
  },
}

module.exports = nextConfig

