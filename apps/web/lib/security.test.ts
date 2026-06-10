import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownExporter } from '@archi/export';
import { isDevLoginAllowed } from './auth';
import { checkRateLimit, resetRateLimits } from './rate-limit';

beforeEach(() => {
  resetRateLimits();
});

describe('dev-login 프로덕션 게이트', () => {
  it('개발 환경에서는 허용된다', () => {
    expect(isDevLoginAllowed({ NODE_ENV: 'development' })).toBe(true);
    expect(isDevLoginAllowed({})).toBe(true);
  });
  it('프로덕션에서는 기본 차단된다', () => {
    expect(isDevLoginAllowed({ NODE_ENV: 'production' })).toBe(false);
  });
  it('프로덕션에서도 명시적 opt-in 시 허용된다', () => {
    expect(isDevLoginAllowed({ NODE_ENV: 'production', ALLOW_DEV_LOGIN: 'true' })).toBe(true);
  });
});

describe('rate limiter', () => {
  it('한도 내 요청은 통과하고 초과 시 RATE_LIMITED 에러를 던진다', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(() => checkRateLimit('test-key', 5, 60_000)).not.toThrow();
    }
    expect(() => checkRateLimit('test-key', 5, 60_000)).toThrowError(/요청이 너무 많습니다/);
  });

  it('키가 다르면 독립적으로 계산된다', () => {
    checkRateLimit('user-a', 1, 60_000);
    expect(() => checkRateLimit('user-b', 1, 60_000)).not.toThrow();
    expect(() => checkRateLimit('user-a', 1, 60_000)).toThrow();
  });
});

describe('export URL sanitize', () => {
  it('markdown export에서 javascript: URL이 제거된다', async () => {
    const result = await new MarkdownExporter().export({
      id: 'doc',
      title: '보안 테스트',
      blocks: [
        {
          id: 'b1',
          type: 'image',
          sortOrder: 0,
          content: { url: 'javascript:alert(1)', caption: '악성 이미지' },
        },
        {
          id: 'b2',
          type: 'cta',
          sortOrder: 1,
          content: { text: '클릭', buttonLabel: '버튼', url: 'data:text/html,evil' },
        },
      ],
    });
    const md = new TextDecoder().decode(result.data);
    expect(md).not.toContain('javascript:');
    expect(md).not.toContain('data:text/html');
    expect(md).toContain('![악성 이미지]()');
    expect(md).toContain('(#)');
  });
});
