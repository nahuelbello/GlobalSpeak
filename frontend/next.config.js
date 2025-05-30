// next.config.js
console.log(
  '🔥 next.config.js cargado, ENV:',
  process.env.NODE_ENV,
  process.env.NEXT_PUBLIC_API_URL
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:4000/api/:path*'
            : `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
      {
        source: '/avatars/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:4000/avatars/:path*'
            : `${process.env.NEXT_PUBLIC_API_URL}/avatars/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;