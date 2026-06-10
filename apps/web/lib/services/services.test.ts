import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { AppError, Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject, listProjects } from './projects';
import { createDocument, getDocument, updateDocument } from './documents';
import { addBlock, deleteBlock, reorderBlocks, updateBlock } from './blocks';

beforeEach(async () => {
  await resetDb();
});

describe('전문 템플릿 문서 생성', () => {
  it('templateId 지정 시 container와 자식 블록이 parentId로 연결돼 생성된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '템플릿 테스트' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '기술자료',
      templateId: 'interior-tech-doc',
    });
    const blocks = await prisma.documentBlock.findMany({
      where: { documentId: doc.id },
      orderBy: { sortOrder: 'asc' },
    });
    const container = blocks.find((b) => b.type === 'container');
    expect(container).toBeTruthy();
    const children = blocks.filter((b) => b.parentId === container!.id);
    expect(children.length).toBeGreaterThan(0);
    expect(children.some((c) => c.type === 'law_reference' || c.type === 'formula')).toBe(true);
  });
});

describe('workspace 권한 체크', () => {
  it('비멤버는 프로젝트를 만들 수 없다 (404로 워크스페이스 존재를 숨김)', async () => {
    const { workspace } = await createUserWithWorkspace();
    const outsider = await createUserWithWorkspace();
    await expect(
      createProject(outsider.user.id, { workspaceId: workspace.id, name: '몰래 프로젝트' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('VIEWER는 문서를 만들 수 없다', async () => {
    const { user, organization, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 A' });
    const viewer = await addMember(organization.id, Roles.VIEWER);
    await expect(
      createDocument(viewer.id, { projectId: project.id, title: '문서', type: 'BLOG_POST' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('VIEWER도 문서 조회는 가능하다', async () => {
    const { user, organization, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 A' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '리모델링 제안서',
      type: 'PROPOSAL',
    });
    const viewer = await addMember(organization.id, Roles.VIEWER);
    const fetched = await getDocument(viewer.id, doc.id);
    expect(fetched.title).toBe('리모델링 제안서');
  });

  it('권한 에러는 한국어 메시지를 가진다', async () => {
    const { workspace } = await createUserWithWorkspace();
    const outsider = await createUserWithWorkspace();
    try {
      await listProjects(outsider.user.id, workspace.id);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toContain('워크스페이스');
    }
  });
});

describe('Document CRUD', () => {
  it('문서 생성/조회/수정이 동작한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 B' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '블로그 초안',
      type: 'BLOG_POST',
    });
    expect(doc.blocks).toEqual([]);

    const updated = await updateDocument(user.id, doc.id, { status: 'NEEDS_REVIEW' });
    expect(updated.status).toBe('NEEDS_REVIEW');

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'document.update', targetId: doc.id },
    });
    expect(audit).not.toBeNull();
  });

  it('없는 문서는 NOT_FOUND', async () => {
    const { user } = await createUserWithWorkspace();
    await expect(getDocument(user.id, 'doc_없음')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('DocumentBlock 순서', () => {
  it('블록 추가/중간삽입/재정렬 후 순서가 유지된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 C' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '시공 일지',
      type: 'REPORT',
    });

    const b1 = await addBlock(user.id, doc.id, {
      block: { type: 'heading', content: { level: 1, text: '거실 리모델링' } },
    });
    const b2 = await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '첫 번째 문단' } },
    });
    // b1 뒤에 삽입 → b1, b3, b2 순서가 되어야 한다
    const b3 = await addBlock(user.id, doc.id, {
      afterBlockId: b1.id,
      block: { type: 'paragraph', content: { text: '중간 삽입 문단' } },
    });

    let fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks.map((b) => b.id)).toEqual([b1.id, b3.id, b2.id]);

    // 재정렬: b2, b1, b3
    await reorderBlocks(user.id, doc.id, { blockIds: [b2.id, b1.id, b3.id] });
    fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks.map((b) => b.id)).toEqual([b2.id, b1.id, b3.id]);
  });

  it('잘못된 블록 내용은 검증 에러', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 D' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '검증 테스트',
      type: 'REPORT',
    });
    await expect(
      addBlock(user.id, doc.id, {
        block: { type: 'heading', content: { text: '레벨 없음' } },
      }),
    ).rejects.toThrow();
  });

  it('블록 수정과 삭제가 동작한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 E' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '수정 테스트',
      type: 'BLOG_POST',
    });
    const block = await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '원본 텍스트' } },
    });

    const updated = await updateBlock(user.id, block.id, {
      content: { text: '수정된 텍스트' },
    });
    expect((updated.content as { text: string }).text).toBe('수정된 텍스트');

    await deleteBlock(user.id, block.id);
    const fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks).toHaveLength(0);
  });
});
