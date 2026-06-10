import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { exchangeAnthropicCode, saveAnthropicOAuthConfig } from '@/lib/services/llm-config';

const OAUTH_COOKIE = 'archi_llm_oauth';

/** Claude 계정 OAuth 콜백: code 교환 → 토큰 암호화 저장 → 설정 화면 복귀 */
export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const settingsUrl = new URL('/studio/settings', url.origin);

  if (oauthError || !code || !state) {
    settingsUrl.searchParams.set('oauth', 'error');
    settingsUrl.searchParams.set('reason', oauthError ?? 'missing_code');
    return NextResponse.redirect(settingsUrl);
  }

  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_COOKIE}=`))
    ?.slice(OAUTH_COOKIE.length + 1);

  let stored: { verifier: string; state: string; workspaceId: string } | null = null;
  try {
    stored = raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    stored = null;
  }

  if (!stored || stored.state !== state) {
    settingsUrl.searchParams.set('oauth', 'error');
    settingsUrl.searchParams.set('reason', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeAnthropicCode({
      code,
      state,
      redirectUri: `${url.origin}/api/settings/llm/oauth/anthropic/callback`,
      codeVerifier: stored.verifier,
    });
    await saveAnthropicOAuthConfig(user.id, stored.workspaceId, tokens);
    settingsUrl.searchParams.set('oauth', 'connected');
  } catch (error) {
    settingsUrl.searchParams.set('oauth', 'error');
    settingsUrl.searchParams.set(
      'reason',
      error instanceof Error ? error.message.slice(0, 120) : 'unknown',
    );
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.set(OAUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
});
