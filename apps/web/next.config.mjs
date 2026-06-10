/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@archi/db',
    '@archi/shared',
    '@archi/ai',
    '@archi/editor',
    '@archi/export',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
