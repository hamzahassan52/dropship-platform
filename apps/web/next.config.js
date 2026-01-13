/** @type {import('next').NextConfig} */
const nextConfig = {
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
