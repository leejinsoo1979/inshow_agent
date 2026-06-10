import { beforeEach, describe, expect, it } from 'vitest';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import {
  approveKnowledgeSource,
  listKnowledgeChunks,
  processKnowledgeSource,
  queryKnowledgeBase,
  uploadKnowledgeSource,
} from './knowledge';

beforeEach(async () => {
  await resetDb();
});

const SAMPLE_MD = `# 욕실 방수 매뉴얼

## 담수 테스트

욕실 방수층 시공 후 담수 테스트는 최소 24시간 이상 실시한다. 배수구를 막고 물을 채운 뒤 누수 여부를 확인한다.

## 방수층 시공

방수층은 바닥 전체와 벽면 최소 1미터 높이까지 시공한다. 모서리는 보강 처리한다.
`;

async function uploadAndProcess(userId: string, workspaceId: string) {
  const source = await uploadKnowledgeSource(userId, {
    workspaceId,
    filename: 'bathroom-manual.md',
    data: Buffer.from(SAMPLE_MD, 'utf8'),
  });
  await processKnowledgeSource(userId, source.id);
  return source;
}

describe('지식베이스 파이프라인', () => {
  it('업로드 → 처리 → 청크 생성 → PENDING_REVIEW', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const source = await uploadAndProcess(user.id, workspace.id);

    const chunks = await listKnowledgeChunks(user.id, source.id);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.text).toContain('욕실');
  });

  it('허용되지 않는 확장자는 거부한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    await expect(
      uploadKnowledgeSource(user.id, {
        workspaceId: workspace.id,
        filename: 'malware.exe',
        data: Buffer.from('x'),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('PENDING_REVIEW 소스는 기본 검색에 사용되지 않는다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    await uploadAndProcess(user.id, workspace.id);

    const before = await queryKnowledgeBase(user.id, {
      workspaceId: workspace.id,
      query: '욕실 방수 담수 테스트 순서',
      topK: 3,
    });
    expect(before.citations).toHaveLength(0);
    expect(before.answer).toContain('찾지 못했습니다');
  });

  it('승인 후에는 관련 청크와 citation이 반환된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const source = await uploadAndProcess(user.id, workspace.id);
    await approveKnowledgeSource(user.id, source.id);

    const result = await queryKnowledgeBase(user.id, {
      workspaceId: workspace.id,
      query: '욕실 방수 담수 테스트 순서',
      topK: 3,
    });
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]!.title).toBe('bathroom-manual.md');
    expect(result.answer).toContain('담수');
  });

  it('EDITOR는 승인 권한이 없다 (자동 승인 금지)', async () => {
    const { user, organization, workspace } = await createUserWithWorkspace();
    const source = await uploadAndProcess(user.id, workspace.id);

    const editor = await addMember(organization.id, Roles.EDITOR);
    await expect(approveKnowledgeSource(editor.id, source.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // KNOWLEDGE_REVIEWER는 승인 가능
    const reviewer = await addMember(organization.id, Roles.KNOWLEDGE_REVIEWER);
    const approved = await approveKnowledgeSource(reviewer.id, source.id);
    expect(approved.status).toBe('APPROVED');
  });
});
