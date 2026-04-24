/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://pamoja-backend-egyp.onrender.com/:path*',
      },
    ]
  },
}
module.exports = nextConfig
