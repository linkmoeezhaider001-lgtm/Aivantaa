export default {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://aivantaa.me/:path*',
      },
    ]
  },
};
