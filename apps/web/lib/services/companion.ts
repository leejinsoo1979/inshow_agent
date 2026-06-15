import { createHash, randomBytes, randomInt } from 'node:crypto';
import { prisma } from '@archi/db';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireWorkspaceCapability } from '../authz';
import { writeAuditLog } from '../audit';

/**
 * 로컬 컴패니언 워커 연동 (헤르메스식 사이드카).
 * 웹은 작업을 큐에 넣고, 사용자 머신의 워커가 페어링 후 폴링하며 codex/claude CLI로 실행한다.
 */

const PAIR_TTL_MS = 10 * 60 * 1000; // 페어링 코드 10분
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const pairDeviceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80).default('내 컴퓨터'),
});

/** (관리자) 기기 페어링 코드 발급 */
export async function pairDevice(userId: string, input: z.infer<typeof pairDeviceSchema>) {
  await requireWorkspaceCapability(userId, input.workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  const pairCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const device = await prisma.companionDevice.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      pairCode,
      pairExpires: new Date(Date.now() + PAIR_TTL_MS),
      status: 'PENDING',
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'companion.pair',
    targetType: 'CompanionDevice',
    targetId: device.id,
  });
  return { deviceId: device.id, pairCode, expiresInSec: PAIR_TTL_MS / 1000 };
}

export const registerDeviceSchema = z.object({
  pairCode: z.string().min(4).max(12),
  name: z.string().min(1).max(80).optional(),
});

/** (워커) 페어링 코드로 등록 → 디바이스 토큰 발급(해시만 저장) */
export async function registerDevice(input: z.infer<typeof registerDeviceSchema>) {
  const device = await prisma.companionDevice.findFirst({
    where: { pairCode: input.pairCode, status: 'PENDING', pairExpires: { gt: new Date() } },
  });
  if (!device) {
    throw new AppError(ErrorCodes.NOT_FOUND, {
      message: '유효하지 않거나 만료된 페어링 코드입니다.',
    });
  }
  const token = randomBytes(32).toString('base64url');
  const updated = await prisma.companionDevice.update({
    where: { id: device.id },
    data: {
      tokenHash: sha256(token),
      status: 'ACTIVE',
      pairCode: null,
      pairExpires: null,
      name: input.name ?? device.name,
      lastSeenAt: new Date(),
    },
  });
  return { deviceId: updated.id, deviceToken: token, name: updated.name };
}

/** (워커) Bearer 토큰으로 디바이스 인증 + lastSeen 갱신 */
async function authDevice(token: string | null) {
  if (!token) throw new AppError(ErrorCodes.UNAUTHORIZED, { message: '디바이스 토큰이 없습니다.' });
  const device = await prisma.companionDevice.findFirst({
    where: { tokenHash: sha256(token), status: 'ACTIVE' },
  });
  if (!device) throw new AppError(ErrorCodes.UNAUTHORIZED, { message: '디바이스 인증 실패.' });
  await prisma.companionDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  return device;
}

/** Authorization: Bearer <token> 헤더에서 디바이스 토큰 추출 */
export function deviceTokenFrom(request: Request): string | null {
  const h = request.headers.get('authorization') ?? '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1]!.trim() : null;
}

export const enqueueJobSchema = z.object({
  workspaceId: z.string().min(1),
  prompt: z.string().min(1).max(8000),
  tool: z.enum(['codex', 'claude']).default('codex'),
  documentId: z.string().optional(),
});

/** (관리자) 작업을 큐에 추가 */
export async function enqueueJob(userId: string, input: z.infer<typeof enqueueJobSchema>) {
  await requireWorkspaceCapability(userId, input.workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  const active = await prisma.companionDevice.findFirst({
    where: { workspaceId: input.workspaceId, status: 'ACTIVE' },
  });
  if (!active) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, {
      message: '연결된 컴패니언 기기가 없습니다. 먼저 기기를 연결해 주세요.',
    });
  }
  const job = await prisma.companionJob.create({
    data: {
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      tool: input.tool,
      prompt: input.prompt,
      status: 'PENDING',
    },
  });
  return { jobId: job.id, status: job.status };
}

/** (워커) 다음 PENDING 작업을 가져가며 RUNNING으로 표시 */
export async function claimNextJob(token: string | null) {
  const device = await authDevice(token);
  const job = await prisma.companionJob.findFirst({
    where: { workspaceId: device.workspaceId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return { job: null };
  const claimed = await prisma.companionJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', deviceId: device.id },
  });
  return { job: { id: claimed.id, tool: claimed.tool, prompt: claimed.prompt } };
}

export const submitResultSchema = z.object({
  result: z.string().max(200_000).optional(),
  error: z.string().max(4000).optional(),
});

/** (워커) 작업 결과 제출 */
export async function submitJobResult(
  token: string | null,
  jobId: string,
  input: z.infer<typeof submitResultSchema>,
) {
  const device = await authDevice(token);
  const job = await prisma.companionJob.findUnique({ where: { id: jobId } });
  if (!job || job.workspaceId !== device.workspaceId) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '작업을 찾을 수 없습니다.' });
  }
  const updated = await prisma.companionJob.update({
    where: { id: jobId },
    data: input.error
      ? { status: 'FAILED', error: input.error }
      : { status: 'DONE', result: input.result ?? '' },
  });
  return { jobId: updated.id, status: updated.status };
}

/** (관리자) 작업 상태/결과 조회 */
export async function getCompanionJob(userId: string, jobId: string) {
  const job = await prisma.companionJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(ErrorCodes.NOT_FOUND, { message: '작업을 찾을 수 없습니다.' });
  await requireWorkspaceCapability(userId, job.workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  return {
    jobId: job.id,
    status: job.status,
    tool: job.tool,
    result: job.result,
    error: job.error,
  };
}

/** (관리자) 워크스페이스의 컴패니언 기기 목록 */
export async function listDevices(userId: string, workspaceId: string) {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.MANAGE_LLM_PROVIDERS);
  const devices = await prisma.companionDevice.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true, lastSeenAt: true },
  });
  return { devices };
}
