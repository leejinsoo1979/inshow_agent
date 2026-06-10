import { NextResponse } from 'next/server';
import { AppError, ErrorCodes } from '@archi/shared';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { createSessionToken, isDevLoginAllowed, SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit, clientIpFrom } from '@/lib/rate-limit';
import { devLogin, devLoginSchema } from '@/lib/services/auth';

export const POST = apiHandler(async (request) => {
  if (!isDevLoginAllowed(process.env)) {
    throw new AppError(ErrorCodes.FORBIDDEN, {
      message: '프로덕션 환경에서는 개발용 로그인이 비활성화되어 있습니다.',
    });
  }
  checkRateLimit(`dev-login:${clientIpFrom(request)}`, 10, 60_000);
  const body = devLoginSchema.parse(await parseJsonBody(request));
  const result = await devLogin(body);
  const response = NextResponse.json({
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    organization: { id: result.organization.id, name: result.organization.name },
    workspaces: result.workspaces.map((w) => ({ id: w.id, name: w.name })),
    role: result.role,
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(result.user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
});
