import { prisma } from '@archi/db';
import {
  AnthropicProvider,
  GeminiProvider,
  GrokProvider,
  MockLlmProvider,
  OpenAIProvider,
  type LlmProvider,
} from '@archi/ai';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireDocumentCapability, requireWorkspaceCapability } from '../authz';
import { writeAuditLog } from '../audit';
import { decryptSecret, encryptSecret, maskSecret } from '../crypto';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Gemini',
  grok: 'Grok',
  anthropic: 'Claude',
};

/**
 * 채팅 패널용: 현재 활성 모델과, 등록된 모든 provider/모델 후보를 반환한다 (커서 스타일 셀렉터).
 * 문서 조회 권한만 있으면 볼 수 있다(편집자도 모델 확인 가능).
 */
export async function getChatModelOptions(userId: string, documentId: string) {
  const { workspaceId } = await requireDocumentCapability(
    userId,
    documentId,
    Capabilities.VIEW_DOCUMENTS,
  );
  const configs = await prisma.llmProviderConfig.findMany({
    where: { workspaceId, provider: { in: ['openai', 'google', 'grok', 'anthropic'] } },
    orderBy: { createdAt: 'desc' },
  });
  const active = configs.find((c) => c.isActive) ?? configs[0] ?? null;
  return {
    workspaceId,
    active: active
      ? { configId: active.id, provider: active.provider, model: active.model }
      : null,
    options: configs.map((c) => ({
      configId: c.id,
      provider: c.provider,
      providerLabel: PROVIDER_LABELS[c.provider] ?? c.provider,
      model: c.model,
      authType: c.authType,
    })),
    /** 등록된 LLM이 없으면 mock 안내용 */
    isMock: configs.length === 0,
  };
}

export const setChatModelSchema = z.object({
  configId: z.string().min(1),
  model: z.string().min(1).max(100),
});

/** 채팅 셀렉터에서 모델 변경. 해당 config의 model을 갱신하고 활성화한다 (관리자 전용) */
export async function setChatModel(
  userId: string,
  documentId: string,
  input: z.infer<typeof setChatModelSchema>,
) {
  const { workspaceId } = await requireDocumentCapability(
    userId,
    documentId,
    Capabilities.MANAGE_LLM_PROVIDERS,
  );
  const config = await prisma.llmProviderConfig.findFirst({
    where: { id: input.configId, workspaceId },
  });
  if (!config) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: 'LLM 설정을 찾을 수 없습니다.' });
  }
  // 선택한 config만 활성화 (한 워크스페이스에 여러 provider가 있을 때 전환)
  await prisma.$transaction([
    prisma.llmProviderConfig.updateMany({
      where: { workspaceId, id: { not: config.id } },
      data: { isActive: false },
    }),
    prisma.llmProviderConfig.update({
      where: { id: config.id },
      data: { model: input.model, isActive: true },
    }),
  ]);
  return { provider: config.provider, model: input.model };
}

// 지원 provider: OpenAI, Anthropic(Claude), Google(Gemini), Grok(xAI).
export const registerLlmConfigSchema = z.object({
  workspaceId: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'grok', 'custom']),
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

// ─── 사용 가능한 모델 목록 (provider API에서 실시간 조회) ────────────────────

/** 키 조회 실패 시 보여줄 최소 폴백 (선택지가 비지 않게). UI는 우선 라이브 목록을 쓴다. */
// 최신 우선 정렬된 폴백 (키 등록 전 임시 표시용). 키 등록 후엔 라이브 목록으로 대체된다.
const FALLBACK_MODELS: Record<string, string[]> = {
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'gpt-4o', 'gpt-4o-mini'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  grok: ['grok-4', 'grok-3', 'grok-3-mini'],
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
};

/**
 * 등록된 키로 provider의 모델 목록을 실시간 조회한다.
 * 키가 없거나 호출 실패 시 폴백 목록을 반환한다. (하드코딩 최소화)
 */
export async function listAvailableModels(
  userId: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic' | 'google' | 'grok',
): Promise<{ models: string[]; live: boolean }> {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  const config = await prisma.llmProviderConfig.findFirst({
    where: { workspaceId, provider },
  });
  const apiKey = config?.encryptedApiKey ? decryptSecret(config.encryptedApiKey) : null;
  if (!apiKey) return { models: FALLBACK_MODELS[provider] ?? [], live: false };

  try {
    const models = await fetchProviderModels(provider, apiKey, config?.baseUrl ?? undefined);
    return models.length > 0
      ? { models, live: true }
      : { models: FALLBACK_MODELS[provider] ?? [], live: false };
  } catch {
    return { models: FALLBACK_MODELS[provider] ?? [], live: false };
  }
}

/** 채팅과 무관한 모델(임베딩/음성/이미지/검열/스냅샷 등)을 걸러낸다 */
function isChatModel(provider: 'openai' | 'anthropic' | 'google' | 'grok', id: string): boolean {
  const lower = id.toLowerCase();
  // 공통 제외: 임베딩/음성/이미지/검열/리얼타임/튜닝 등
  if (
    /embedding|embed|whisper|tts|audio|speech|moderation|image|vision-only|dall-?e|realtime|transcribe|search|rerank|aqa|guard/.test(
      lower,
    )
  ) {
    return false;
  }
  if (provider === 'openai') {
    // gpt / o-시리즈 메인 라인만. 날짜 스냅샷(-2024-..)·preview·instruct 제외
    if (!/^(gpt-|o\d|chatgpt)/.test(lower)) return false;
    if (/\d{4}-\d{2}-\d{2}|-\d{4}$|preview|instruct|audio|search/.test(lower)) return false;
    return true;
  }
  if (provider === 'anthropic') {
    // claude-* 채팅 모델. Anthropic ids는 날짜가 붙어 있어 날짜 제외 규칙을 적용하지 않는다.
    return lower.startsWith('claude');
  }
  if (provider === 'google') {
    if (!lower.startsWith('gemini-')) return false;
    // 실험판/숫자 빌드 스냅샷·튜닝(-001/-exp/-tuning) 제외, 일반 별칭만
    if (/-\d{3}$|exp|tuning|thinking-exp|latest-\d/.test(lower)) return false;
    return true;
  }
  // grok: grok-* 메인. 날짜 스냅샷 제외
  if (!lower.startsWith('grok')) return false;
  if (/\d{4}-\d{2}-\d{2}|-\d{4}$/.test(lower)) return false;
  return true;
}

/** 모델명에서 버전 숫자를 뽑아 최신(높은 버전·세대)이 위로 오게 정렬 */
function modelRank(id: string): number {
  const nums = id.match(/\d+(?:\.\d+)?/g);
  const major = nums?.[0] ? parseFloat(nums[0]) : 0;
  const minor = nums?.[1] ? parseFloat(nums[1]) : 0;
  // 'pro' > 'flash' > 'mini' 같은 티어 가중치 (동일 버전 내 정렬용)
  const tier = /pro|opus|max|\bultra\b/.test(id) ? 3 : /flash|sonnet|standard/.test(id) ? 2 : 1;
  // OpenAI o-시리즈(o3/o4-mini 등)는 최신 추론 모델이라 버전 숫자가 낮아도 상위로 끌어올린다
  const reasoningBonus = /^o\d/.test(id) ? 800 : 0;
  return major * 1000 + minor * 100 + tier + reasoningBonus;
}

function sortModelsNewestFirst(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => {
    const diff = modelRank(b) - modelRank(a);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

async function fetchProviderModels(
  provider: 'openai' | 'anthropic' | 'google' | 'grok',
  apiKey: string,
  baseUrl?: string,
): Promise<string[]> {
  if (provider === 'anthropic') {
    const base = baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com';
    const res = await fetch(`${base}/v1/models?limit=200`, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: string }[] };
    const ids = (data.data ?? [])
      .map((m) => m.id ?? '')
      .filter((id) => id && isChatModel('anthropic', id));
    return sortModelsNewestFirst(ids);
  }
  if (provider === 'google') {
    const base = baseUrl?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com';
    const res = await fetch(`${base}/v1beta/models?pageSize=200`, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const ids = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter((id) => id && isChatModel('google', id));
    return sortModelsNewestFirst(ids);
  }
  // openai / grok 은 OpenAI 호환 /v1/models
  const base =
    baseUrl?.replace(/\/$/, '') ||
    (provider === 'grok' ? 'https://api.x.ai' : 'https://api.openai.com');
  const res = await fetch(`${base}/v1/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { id?: string }[] };
  const ids = (data.data ?? [])
    .map((m) => m.id ?? '')
    .filter((id) => id && isChatModel(provider, id));
  return sortModelsNewestFirst(ids);
}

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

  if (config.authType !== 'oauth' && !config.encryptedApiKey) return new MockLlmProvider();
  const apiKey = config.encryptedApiKey ? decryptSecret(config.encryptedApiKey) : '';

  switch (config.provider) {
    case 'openai': {
      if (config.authType === 'oauth') {
        const authToken = await ensureFreshOAuthToken('openai', config);
        return new OpenAIProvider({ authToken, ...common });
      }
      return new OpenAIProvider({ apiKey, ...common });
    }
    case 'anthropic': {
      if (config.authType === 'oauth') {
        const authToken = await ensureFreshOAuthToken('anthropic', config);
        return new AnthropicProvider({ authToken, ...common });
      }
      return new AnthropicProvider({ apiKey, ...common });
    }
    case 'google':
      return new GeminiProvider({ apiKey, ...common });
    case 'grok':
      return new GrokProvider({ apiKey, ...common });
    default:
      // custom 등 미지원 provider는 mock으로 폴백.
      return new MockLlmProvider();
  }
}
