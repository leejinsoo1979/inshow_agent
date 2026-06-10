import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { readStorageFile } from '../storage';
import { createProject } from './projects';
import { generateImage, getImageVersionFile } from './images';

beforeEach(async () => {
  await resetDb();
});

async function setup() {
  const ctx = await createUserWithWorkspace();
  const project = await createProject(ctx.user.id, {
    workspaceId: ctx.workspace.id,
    name: '이미지 테스트 현장',
  });
  return { ...ctx, project };
}

describe('이미지 생성', () => {
  it('프롬프트로 생성 시 asset/version과 메타데이터가 저장된다', async () => {
    const { user, project } = await setup();
    const result = await generateImage(user.id, {
      projectId: project.id,
      prompt: '화이트 오크 주방, 무광 세라믹 상판, 간접조명',
      size: '1024x1024',
      count: 2,
    });

    expect(result.versions).toHaveLength(2);

    const asset = await prisma.imageAsset.findUnique({
      where: { id: result.imageAssetId },
      include: { versions: true },
    });
    expect(asset?.source).toBe('GENERATED');
    expect(asset?.versions).toHaveLength(2);

    // 원본 메타데이터 저장 확인 (CLAUDE.md 규칙 6)
    const version = asset!.versions[0]!;
    expect(version.prompt).toContain('화이트 오크 주방');
    expect(version.provider).toBe('mock');
    expect(version.model).toBe('mock-image-1');
    expect(version.width).toBe(1024);

    // 파일 저장 확인
    const file = await readStorageFile(version.fileKey);
    expect(file.toString('utf8')).toContain('<svg');
  });

  it('파일 서빙은 workspace 권한을 검증한다', async () => {
    const { user, project } = await setup();
    const result = await generateImage(user.id, {
      projectId: project.id,
      prompt: '거실 인테리어',
    });
    const versionId = result.versions[0]!.id;

    const file = await getImageVersionFile(user.id, versionId);
    expect(file.mimeType).toBe('image/svg+xml');

    const outsider = await createUserWithWorkspace();
    await expect(getImageVersionFile(outsider.user.id, versionId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('VIEWER는 이미지 생성이 불가하다', async () => {
    const { organization, project } = await setup();
    const viewer = await addMember(organization.id, Roles.VIEWER);
    await expect(
      generateImage(viewer.id, { projectId: project.id, prompt: '거실' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
