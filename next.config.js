/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['via.placeholder.com', 'meudxkmoyrzmhznhcvdz.supabase.co'],
  },
  typescript: {
    // Allows production builds to complete even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

