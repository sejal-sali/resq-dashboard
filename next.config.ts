/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
};

module.exports = nextConfig;