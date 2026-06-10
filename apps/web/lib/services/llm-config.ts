import { prisma } from '@archi/db';
import { AnthropicProvider, MockLlmProvider, type LlmProvider } from '@archi/ai';
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
  return configs.map((c) => toSafeConfig(c, decryptSecret(c.encryptedApiKey)));
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

/** API 키는 절대 원문으로 반환하지 않는다 */
function toSafeConfig(
  config: {
    id: string;
    provider: string;
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
    model: config.model,
    baseUrl: config.baseUrl,
    isActive: config.isActive,
    maskedApiKey: maskSecret(plainKey),
    createdAt: config.createdAt,
  };
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
  const apiKey = decryptSecret(config.encryptedApiKey);
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider({
        apiKey,
        model: config.model ?? undefined,
        baseUrl: config.baseUrl ?? undefined,
      });
    default:
      // openai/custom 어댑터는 추후 추가. 등록은 가능하나 실행은 mock으로 폴백.
      return new MockLlmProvider();
  }
}
