import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const localBackend = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const prodBackend = 'https://phpstack-1344824-6717026.cloudwaysapps.com';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.ngrok-free.app',
    '*.ngrok.io',
    'localhost:3000',
    'localhost:5000',
    '127.0.0.1:3000',
    '127.0.0.1:5000',
  ],
  async rewrites() {
    // In production, Express serves /uploads/* and /api/* directly — no rewrite needed.
    // In dev, proxy both to the local Express server.
    if (isProd) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${localBackend}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${localBackend}/uploads/:path*`,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '5000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'phpstack-1344824-6717026.cloudwaysapps.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**.ngrok-free.dev', pathname: '/**' },
      { protocol: 'https', hostname: '**.ngrok.app', pathname: '/**' },
    ],
  },
};

export default nextConfig;
