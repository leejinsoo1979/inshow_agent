import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireWorkspaceCapability } from '@/lib/authz';
import { buildAnthropicAuthorizeUrl } from '@/lib/services/llm-config';

const OAUTH_COOKIE = 'archi_llm_oauth';

/**
 * Claude 계정 OAuth 시작: PKCE verifier/state를 httpOnly 쿠키에 보관하고
 * claude.ai 인증 화면으로 리다이렉트한다.
 */
export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, { message: 'workspaceId가 필요합니다.' });
  }
  await requireWorkspaceCapability(user.id, workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);

  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('base64url');
  const redirectUri = `${url.origin}/api/settings/llm/oauth/anthropic/callback`;

  const authorizeUrl = buildAnthropicAuthorizeUrl({
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ verifier, state, workspaceId }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return response;
});
