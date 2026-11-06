/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://aivantaa.me/:path*',
      },
    ];
  },
};

export default nextConfig;
