import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/web/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // DB integration 테스트가 같은 DB를 공유하므로 파일 단위 직렬 실행
    fileParallelism: false,
  },
});
