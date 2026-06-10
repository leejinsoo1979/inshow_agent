/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@archi/db',
    '@archi/shared',
    '@archi/ai',
    '@archi/editor',
    '@archi/export',
    '@archi/image',
    '@archi/knowledge',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
