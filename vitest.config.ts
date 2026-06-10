import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Next.js의 "@/..." 별칭 (apps/web 기준)
    alias: { '@': path.resolve(__dirname, 'apps/web') },
  },
  test: {
    environment: 'node',
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://archi:archi_dev@localhost:5433/archi_agent',
    },
    include: ['packages/**/src/**/*.test.ts', 'apps/web/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // DB integration 테스트가 같은 DB를 공유하므로 파일 단위 직렬 실행
    fileParallelism: false,
  },
});
