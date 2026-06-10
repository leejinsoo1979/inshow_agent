import { prisma } from '@archi/db';
import { MockImageProvider } from '@archi/image';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireProjectCapability, requireWorkspaceCapability } from '../authz';
import { writeAuditLog } from '../audit';
import { readStorageFile, saveStorageFile } from '../storage';

export const generateImageSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1, '이미지 프롬프트를 입력해 주세요.').max(2000),
  style: z.string().max(100).optional(),
  size: z
    .string()
    .regex(/^\d{2,4}x\d{2,4}$/, '크기는 1024x1024 형식으로 입력해 주세요.')
    .optional(),
  count: z.number().int().min(1).max(4).optional(),
});

function getImageProvider() {
  // IMAGE_PROVIDER env로 실제 provider 교체 예정. 현재는 mock만 지원.
  return new MockImageProvider();
}

/** 이미지 생성: ImageAsset + ImageVersion 생성, prompt/model 메타데이터 저장 */
export async function generateImage(userId: string, input: z.infer<typeof generateImageSchema>) {
  const { workspaceId } = await requireProjectCapability(
    userId,
    input.projectId,
    Capabilities.GENERATE_IMAGES,
  );

  const provider = getImageProvider();
  const result = await provider.generate({
    prompt: input.prompt,
    style: input.style,
    size: input.size,
    count: input.count,
  });

  const asset = await prisma.imageAsset.create({
    data: {
      workspaceId,
      projectId: input.projectId,
      title: input.prompt.slice(0, 100),
      source: 'GENERATED',
    },
  });

  const versions = [];
  for (const image of result.images) {
    const version = await prisma.imageVersion.create({
      data: {
        imageAssetId: asset.id,
        fileKey: '',
        mimeType: image.mimeType,
        prompt: input.prompt,
        provider: result.provider,
        model: result.model,
        width: image.width,
        height: image.height,
      },
    });
    const ext = image.mimeType === 'image/svg+xml' ? 'svg' : 'png';
    const fileKey = `images/${asset.id}/${version.id}.${ext}`;
    await saveStorageFile(fileKey, image.data);
    versions.push(
      await prisma.imageVersion.update({ where: { id: version.id }, data: { fileKey } }),
    );
  }

  await writeAuditLog({
    actorId: userId,
    action: 'image.generate',
    targetType: 'ImageAsset',
    targetId: asset.id,
    after: { prompt: input.prompt, provider: result.provider, model: result.model },
  });

  return {
    imageAssetId: asset.id,
    versions: versions.map((v) => ({
      id: v.id,
      url: `/api/images/versions/${v.id}/file`,
      width: v.width,
      height: v.height,
      prompt: v.prompt,
      provider: v.provider,
      model: v.model,
    })),
  };
}

/** 이미지 파일 서빙 (workspace 권한 검증 포함) */
export async function getImageVersionFile(userId: string, versionId: string) {
  const version = await prisma.imageVersion.findUnique({
    where: { id: versionId },
    include: { imageAsset: true },
  });
  if (!version || !version.fileKey) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '이미지를 찾을 수 없습니다.' });
  }
  await requireWorkspaceCapability(
    userId,
    version.imageAsset.workspaceId,
    Capabilities.VIEW_DOCUMENTS,
  );
  const data = await readStorageFile(version.fileKey);
  return { data, mimeType: version.mimeType ?? 'application/octet-stream' };
}

export async function getImageAsset(userId: string, assetId: string) {
  const asset = await prisma.imageAsset.findUnique({
    where: { id: assetId },
    include: { versions: { orderBy: { createdAt: 'asc' } } },
  });
  if (!asset) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '이미지를 찾을 수 없습니다.' });
  }
  await requireWorkspaceCapability(userId, asset.workspaceId, Capabilities.VIEW_DOCUMENTS);
  return asset;
}
