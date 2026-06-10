import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma, type User } from '@archi/db';
import { AppError, ErrorCodes } from '@archi/shared';

export const SESSION_COOKIE = 'archi_session';

/**
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

function secret(): string {
  return process.env.AUTH_SECRET ?? 'dev-secret-change-me';
}

/** userId를 HMAC 서명된 세션 토큰으로 변환 (개발용 경량 세션) */
export function createSessionToken(userId: string): string {
  const payload = Buffer.from(userId, 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  return Buffer.from(payload, 'base64url').toString('utf8');
}

/** 현재 요청의 세션 사용자 조회. 없으면 null */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** 로그인 필수 헬퍼. 미로그인 시 401 AppError */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED);
  }
  return user;
}
