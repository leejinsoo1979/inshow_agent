/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@archi/db',
    '@archi/shared',
    '@archi/ai',
    '@archi/editor',
    '@archi/export',
    '@archi/image',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
