import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { readStorageFile } from '../storage';
import { createProject } from './projects';
import { createDocument, getDocument } from './documents';
import { addBlock } from './blocks';
import { generateImage, inpaintImage } from './images';

beforeEach(async () => {
  await resetDb();
});

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function setup() {
  const ctx = await createUserWithWorkspace();
  const project = await createProject(ctx.user.id, {
    workspaceId: ctx.workspace.id,
    name: '인페인트 현장',
  });
  const generated = await generateImage(ctx.user.id, {
    projectId: project.id,
    prompt: '화이트 톤 거실',
    size: '1024x1024',
  });
  return { ...ctx, project, generated };
}

describe('인페인트', () => {
  it('원본은 보존되고 새 버전이 생성된다', async () => {
    const { user, generated } = await setup();
    const baseVersion = generated.versions[0]!;
    const baseFileBefore = await readStorageFile(
      (await prisma.imageVersion.findUniqueOrThrow({ where: { id: baseVersion.id } })).fileKey,
    );

    const result = await inpaintImage(user.id, {
      imageAssetId: generated.imageAssetId,
      baseVersionId: baseVersion.id,
      prompt: '벽면 타일을 베이지 톤으로 변경',
      maskDataUrl: TINY_PNG_DATA_URL,
    });

    expect(result.version.id).not.toBe(baseVersion.id);

    // 새 버전 메타데이터
    const newVersion = await prisma.imageVersion.findUniqueOrThrow({
      where: { id: result.version.id },
    });
    expect(newVersion.prompt).toContain('베이지');
    expect(newVersion.model).toBe('mock-inpaint-1');
    expect(newVersion.maskFileKey).toBeTruthy();

    // 원본 파일/레코드 불변
    const baseAfter = await prisma.imageVersion.findUniqueOrThrow({
      where: { id: baseVersion.id },
    });
    expect(baseAfter.prompt).toBe('화이트 톤 거실');
    const baseFileAfter = await readStorageFile(baseAfter.fileKey);
    expect(baseFileAfter.equals(baseFileBefore)).toBe(true);

    // asset에 버전 2개
    const asset = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: generated.imageAssetId },
      include: { versions: true },
    });
    expect(asset.versions).toHaveLength(2);
  });

  it('replaceBlockId 지정 시 문서 이미지 블록이 새 버전으로 교체된다', async () => {
    const { user, project, generated } = await setup();
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '인페인트 문서',
      type: 'BLOG_POST',
    });
    const baseVersion = generated.versions[0]!;
    const block = await addBlock(user.id, doc.id, {
      block: {
        type: 'image',
        content: {
          imageAssetId: generated.imageAssetId,
          versionId: baseVersion.id,
          url: baseVersion.url,
          caption: '수정 전 거실',
        },
      },
    });

    const result = await inpaintImage(user.id, {
      imageAssetId: generated.imageAssetId,
      baseVersionId: baseVersion.id,
      prompt: '간접조명 추가',
      replaceBlockId: block.id,
    });
    expect(result.replacedBlockId).toBe(block.id);

    const fetched = await getDocument(user.id, doc.id);
    const content = fetched.blocks[0]!.content as { versionId: string; url: string };
    expect(content.versionId).toBe(result.version.id);
    expect(content.url).toContain(result.version.id);
  });

  it('VIEWER는 인페인트가 불가하다', async () => {
    const { organization, generated } = await setup();
    const viewer = await addMember(organization.id, Roles.VIEWER);
    await expect(
      inpaintImage(viewer.id, {
        imageAssetId: generated.imageAssetId,
        baseVersionId: generated.versions[0]!.id,
        prompt: '변경',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
