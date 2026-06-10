import { prisma } from '@archi/db';
import { AnthropicProvider, MockLlmProvider, OpenAIProvider, type LlmProvider } from '@archi/ai';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireWorkspaceCapability } from '../authz';
import { writeAuditLog } from '../audit';
import { decryptSecret, encryptSecret, maskSecret } from '../crypto';

export const registerLlmConfigSchema = z.object({
  workspaceId: z.string().min(1),
  provider: z.enum(['anthropic', 'openai', 'custom']),
  apiKey: z.string().min(8, 'API 키를 입력해 주세요.').max(500),
  model: z.string().max(100).optional(),
  baseUrl: z.string().url('올바른 URL을 입력해 주세요.').optional(),
});

/** LLM API 등록. 관리자(OWNER/ADMIN)만 가능. 키는 AES-256-GCM으로 암호화 저장 */
export async function registerLlmConfig(
  userId: string,
  input: z.infer<typeof registerLlmConfigSchema>,
) {
  await requireWorkspaceCapability(userId, input.workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);

  // 같은 provider 기존 설정은 교체 (워크스페이스당 provider별 1개)
  await prisma.llmProviderConfig.deleteMany({
    where: { workspaceId: input.workspaceId, provider: input.provider },
  });
  const config = await prisma.llmProviderConfig.create({
    data: {
      workspaceId: input.workspaceId,
      provider: input.provider,
      authType: 'api_key',
      model: input.model,
      baseUrl: input.baseUrl,
      encryptedApiKey: encryptSecret(input.apiKey),
      isActive: true,
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'llm_config.register',
    targetType: 'LlmProviderConfig',
    targetId: config.id,
    after: { provider: config.provider, model: config.model },
  });
  return toSafeConfig(config, input.apiKey);
}

export async function listLlmConfigs(userId: string, workspaceId: string) {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  const configs = await prisma.llmProviderConfig.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return configs.map((c) =>
    toSafeConfig(c, c.encryptedApiKey ? decryptSecret(c.encryptedApiKey) : ''),
  );
}

export async function deleteLlmConfig(userId: string, configId: string) {
  const config = await prisma.llmProviderConfig.findUnique({ where: { id: configId } });
  if (!config) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: 'LLM 설정을 찾을 수 없습니다.' });
  }
  await requireWorkspaceCapability(userId, config.workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  await prisma.llmProviderConfig.delete({ where: { id: configId } });
  await writeAuditLog({
    actorId: userId,
    action: 'llm_config.delete',
    targetType: 'LlmProviderConfig',
    targetId: configId,
    before: { provider: config.provider },
  });
  return { deleted: true };
}

/** API 키/토큰은 절대 원문으로 반환하지 않는다 */
function toSafeConfig(
  config: {
    id: string;
    provider: string;
    authType: string;
    model: string | null;
    baseUrl: string | null;
    isActive: boolean;
    createdAt: Date;
  },
  plainKey: string,
) {
  return {
    id: config.id,
    provider: config.provider,
    authType: config.authType,
    model: config.model,
    baseUrl: config.baseUrl,
    isActive: config.isActive,
    maskedApiKey: config.authType === 'oauth' ? 'Claude 계정 연결됨' : maskSecret(plainKey),
    createdAt: config.createdAt,
  };
}

// ─── LLM 계정 OAuth (Claude / ChatGPT) ──────────────────────────────────────

export const OAUTH_PROVIDERS = {
  anthropic: {
    label: 'Claude',
    authorizeUrl: 'https://claude.ai/oauth/authorize',
    tokenUrl: 'https://console.anthropic.com/v1/oauth/token',
    scope: 'org:create_api_key user:profile user:inference',
    clientIdEnv: 'ANTHROPIC_OAUTH_CLIENT_ID',
    /** 토큰 엔드포인트 본문 형식 */
    tokenBody: 'json' as 'json' | 'form',
    extraAuthParams: { code: 'true' } as Record<string, string>,
  },
  openai: {
    label: 'ChatGPT',
    authorizeUrl: 'https://auth.openai.com/oauth/authorize',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    scope: 'openid profile email offline_access',
    clientIdEnv: 'OPENAI_OAUTH_CLIENT_ID',
    tokenBody: 'form' as 'json' | 'form',
    extraAuthParams: {} as Record<string, string>,
  },
} as const;

export type OAuthProviderKey = keyof typeof OAUTH_PROVIDERS;

export function isOAuthProvider(value: string): value is OAuthProviderKey {
  return value in OAUTH_PROVIDERS;
}

export function oauthClientId(provider: OAuthProviderKey): string | null {
  return process.env[OAUTH_PROVIDERS[provider].clientIdEnv] || null;
}

export function buildOAuthAuthorizeUrl(
  provider: OAuthProviderKey,
  input: { redirectUri: string; state: string; codeChallenge: string },
): string {
  const meta = OAUTH_PROVIDERS[provider];
  const clientId = oauthClientId(provider);
  if (!clientId) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, {
      message: `${meta.label} 계정 연결이 설정되지 않았습니다. ${meta.clientIdEnv} 환경변수를 추가해 주세요.`,
    });
  }
  const params = new URLSearchParams({
    ...meta.extraAuthParams,
    client_id: clientId,
    response_type: 'code',
    redirect_uri: input.redirectUri,
    scope: meta.scope,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${meta.authorizeUrl}?${params.toString()}`;
}

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

async function postToken(
  provider: OAuthProviderKey,
  payload: Record<string, string>,
): Promise<Response> {
  const meta = OAUTH_PROVIDERS[provider];
  if (meta.tokenBody === 'form') {
    return fetch(meta.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
    });
  }
  return fetch(meta.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function exchangeOAuthCode(
  provider: OAuthProviderKey,
  input: { code: string; state: string; redirectUri: string; codeVerifier: string },
): Promise<OAuthTokens> {
  const meta = OAUTH_PROVIDERS[provider];
  const clientId = oauthClientId(provider);
  if (!clientId) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, { message: 'OAuth 클라이언트 미설정.' });
  }
  const response = await postToken(provider, {
    grant_type: 'authorization_code',
    code: input.code,
    state: input.state,
    client_id: clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AppError(ErrorCodes.INTERNAL_ERROR, {
      message: `${meta.label} 계정 연결에 실패했습니다 (${response.status}). ${body.slice(0, 200)}`,
    });
  }
  return (await response.json()) as OAuthTokens;
}

/** OAuth 토큰을 암호화 저장 (해당 provider 기존 설정은 교체) */
export async function saveOAuthConfig(
  userId: string,
  workspaceId: string,
  provider: OAuthProviderKey,
  tokens: OAuthTokens,
  model?: string,
) {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  await prisma.llmProviderConfig.deleteMany({ where: { workspaceId, provider } });
  const config = await prisma.llmProviderConfig.create({
    data: {
      workspaceId,
      provider,
      authType: 'oauth',
      model: model ?? null,
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      isActive: true,
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'llm_config.oauth_connect',
    targetType: 'LlmProviderConfig',
    targetId: config.id,
    after: { provider, authType: 'oauth' },
  });
  return toSafeConfig(config, '');
}

/** 만료(60초 전) 시 refresh token으로 access token 자동 갱신 */
async function ensureFreshOAuthToken(
  provider: OAuthProviderKey,
  config: {
    id: string;
    encryptedAccessToken: string | null;
    encryptedRefreshToken: string | null;
    tokenExpiresAt: Date | null;
  },
): Promise<string> {
  if (!config.encryptedAccessToken) {
    throw new Error('저장된 OAuth 토큰이 없습니다.');
  }
  const stillValid =
    !config.tokenExpiresAt || config.tokenExpiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) return decryptSecret(config.encryptedAccessToken);

  const clientId = oauthClientId(provider);
  if (!clientId || !config.encryptedRefreshToken) {
    // 갱신 불가 — 만료된 토큰이라도 시도는 가능하게 반환
    return decryptSecret(config.encryptedAccessToken);
  }
  const response = await postToken(provider, {
    grant_type: 'refresh_token',
    refresh_token: decryptSecret(config.encryptedRefreshToken),
    client_id: clientId,
  });
  if (!response.ok) {
    return decryptSecret(config.encryptedAccessToken);
  }
  const tokens = (await response.json()) as OAuthTokens;
  await prisma.llmProviderConfig.update({
    where: { id: config.id },
    data: {
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : config.encryptedRefreshToken,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    },
  });
  return tokens.access_token;
}

/**
 * 워크스페이스에 등록된 LLM provider 반환. 없으면 mock.
 * 에이전트는 이 함수를 통해서만 LLM에 접근한다 (provider lock-in 방지).
 */
export async function getLlmProviderForWorkspace(workspaceId: string): Promise<LlmProvider> {
  const config = await prisma.llmProviderConfig.findFirst({
    where: { workspaceId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!config) return new MockLlmProvider();

  const common = {
    model: config.model ?? undefined,
    baseUrl: config.baseUrl ?? undefined,
  };

  switch (config.provider) {
    case 'anthropic': {
      if (config.authType === 'oauth') {
        const authToken = await ensureFreshOAuthToken('anthropic', config);
        return new AnthropicProvider({ authToken, ...common });
      }
      if (!config.encryptedApiKey) return new MockLlmProvider();
      return new AnthropicProvider({ apiKey: decryptSecret(config.encryptedApiKey), ...common });
    }
    case 'openai': {
      if (config.authType === 'oauth') {
        const authToken = await ensureFreshOAuthToken('openai', config);
        return new OpenAIProvider({ authToken, ...common });
      }
      if (!config.encryptedApiKey) return new MockLlmProvider();
      return new OpenAIProvider({ apiKey: decryptSecret(config.encryptedApiKey), ...common });
    }
    default:
      // custom 어댑터는 추후 추가. 등록은 가능하나 실행은 mock으로 폴백.
      return new MockLlmProvider();
  }
}
