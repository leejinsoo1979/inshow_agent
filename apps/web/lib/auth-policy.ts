/**
 * 인증 정책 (런타임 의존성 없는 순수 함수 — 테스트에서 next-auth 로드 없이 사용).
 * dev-login은 개발 편의 기능이다.
 * 프로덕션에서는 ALLOW_DEV_LOGIN=true를 명시하지 않는 한 비활성화한다.
 */
export function isDevLoginAllowed(env: {
  NODE_ENV?: string;
  ALLOW_DEV_LOGIN?: string;
}): boolean {
  if (env.NODE_ENV !== 'production') return true;
  return env.ALLOW_DEV_LOGIN === 'true';
}
