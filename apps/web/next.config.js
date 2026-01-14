/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Fast Refresh for better hot reload
  reactStrictMode: true,
  
  // Enable fast refresh
  swcMinify: true,
  
  // Watch for file changes in all directories
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding
      ignored: ['**/node_modules', '**/.next', '**/dist'],
    };
    return config;
  },
  
  // Proxy API requests to NestJS backend
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost:4000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
