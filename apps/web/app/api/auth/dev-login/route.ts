import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { devLogin, devLoginSchema } from '@/lib/services/auth';

export const POST = apiHandler(async (request) => {
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
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
});
