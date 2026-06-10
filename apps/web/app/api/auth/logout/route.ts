import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/auth';

/** dev 세션 쿠키 제거. (Auth.js 세션은 클라이언트에서 signOut으로 종료) */
export const POST = apiHandler(async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
});
