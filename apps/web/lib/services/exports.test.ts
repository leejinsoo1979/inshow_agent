import { beforeEach, describe, expect, it } from 'vitest';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { readStorageFile } from '../storage';
import { createProject } from './projects';
import { createDocument } from './documents';
import { addBlock } from './blocks';
import { createExport, getExportJob } from './exports';

beforeEach(async () => {
  await resetDb();
});

async function setupDocumentWithBlocks() {
  const ctx = await createUserWithWorkspace();
  const project = await createProject(ctx.user.id, {
    workspaceId: ctx.workspace.id,
    name: '내보내기 테스트',
  });
  const doc = await createDocument(ctx.user.id, {
    projectId: project.id,
    title: '내보내기 문서',
    type: 'BLOG_POST',
  });
  await addBlock(ctx.user.id, doc.id, {
    block: { type: 'heading', content: { level: 1, text: '제목 블록' } },
  });
  await addBlock(ctx.user.id, doc.id, {
    block: { type: 'paragraph', content: { text: '본문 블록' } },
  });
  return { ...ctx, doc };
}

describe('Export job', () => {
  it('markdown export job이 완료되고 파일이 저장된다', async () => {
    const { user, doc } = await setupDocumentWithBlocks();
    const result = await createExport(user.id, { documentId: doc.id, format: 'markdown' });
    expect(result.status).toBe('DONE');

    const job = await getExportJob(user.id, result.jobId);
    expect(job.downloadUrl).toBe(`/api/exports/${result.jobId}/download`);

    const jobDetail = await getExportJob(user.id, result.jobId);
    expect(jobDetail.filename).toContain('.md');

    const saved = await readStorageFile(`exports/${result.jobId}/${jobDetail.filename}`);
    expect(saved.toString('utf8')).toContain('# 내보내기 문서');
  });

  it('pdf export가 유효한 PDF를 만든다', async () => {
    const { user, doc } = await setupDocumentWithBlocks();
    const result = await createExport(user.id, { documentId: doc.id, format: 'pdf' });
    const jobDetail = await getExportJob(user.id, result.jobId);
    const saved = await readStorageFile(`exports/${result.jobId}/${jobDetail.filename}`);
    expect(saved.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('비멤버는 export할 수 없다', async () => {
    const { doc } = await setupDocumentWithBlocks();
    const outsider = await createUserWithWorkspace();
    await expect(
      createExport(outsider.user.id, { documentId: doc.id, format: 'txt' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('VIEWER는 export 작업 조회는 가능하다', async () => {
    const { user, organization, doc } = await setupDocumentWithBlocks();
    const result = await createExport(user.id, { documentId: doc.id, format: 'txt' });
    const viewer = await addMember(organization.id, Roles.VIEWER);
    const job = await getExportJob(viewer.id, result.jobId);
    expect(job.status).toBe('DONE');
  });
});
