import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { detectQuestionIntent, planAgentResponse, requiresCitation } from '@archi/ai';
import { createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument, getDocument } from './documents';
import { approveAction, chat } from './agent';

beforeEach(async () => {
  await resetDb();
});

describe('법규/공법 질문 감지', () => {
  it('법규 키워드를 감지한다', () => {
    expect(detectQuestionIntent('상가 방화문 교체 시 법규 확인해줘')).toBe('legal');
    expect(detectQuestionIntent('용적률 계산 방법 알려줘')).toBe('legal');
  });
  it('시공 키워드를 감지한다', () => {
    expect(detectQuestionIntent('욕실 방수 담수 테스트 순서 알려줘')).toBe('construction_detail');
  });
  it('일반 질문은 citation이 필요 없다', () => {
    expect(requiresCitation('블로그 초안 작성해줘')).toBe(false);
  });
});

describe('citation 없는 법규 답변 금지', () => {
  it('검색 결과가 없으면 확답 불가 메시지를 반환하고 액션을 만들지 않는다', () => {
    const plan = planAgentResponse({
      message: '방화문 법규 알려줘',
      documentId: 'doc_1',
      searchResults: [],
    });
    expect(plan.reply).toContain('확답');
    expect(plan.actions).toHaveLength(0);
  });
});

describe('검색 → 출처 카드 → source_reference 블록 삽입', () => {
  async function setup() {
    const ctx = await createUserWithWorkspace();
    const project = await createProject(ctx.user.id, {
      workspaceId: ctx.workspace.id,
      name: '상가 인테리어',
    });
    const doc = await createDocument(ctx.user.id, {
      projectId: project.id,
      title: '상가 방화문 검토',
      type: 'REPORT',
    });
    return { ...ctx, doc };
  }

  it('법규 질문 시 출처가 응답에 포함되고, 승인 시 Citation 레코드가 생성된다', async () => {
    const { user, doc } = await setup();

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '상가 방화문 교체 인테리어 법규 알려줘',
    });

    // 출처 카드 데이터
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]!.publisher).toContain('법제처');

    // source_reference 블록 삽입 액션
    expect(result.actions).toHaveLength(1);
    await approveAction(user.id, result.actions[0]!.id);

    const fetched = await getDocument(user.id, doc.id);
    const sourceBlock = fetched.blocks.find((b) => b.type === 'source_reference');
    expect(sourceBlock).toBeDefined();

    const content = sourceBlock!.content as { citations: string[] };
    expect(content.citations.length).toBeGreaterThan(0);

    const citations = await prisma.citation.findMany({ where: { blockId: sourceBlock!.id } });
    expect(citations.length).toBe(content.citations.length);
    expect(citations[0]!.title).toBeTruthy();
    expect(citations[0]!.retrievedAt).not.toBeNull();
  });

  it('검색 결과가 없는 법규 질문은 확답을 거부한다 (서비스 레벨)', async () => {
    const { user, doc } = await setup();
    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '방화문 법규 NO_RESULTS 알려줘',
    });
    expect(result.reply.text).toContain('확답');
    expect(result.actions).toHaveLength(0);
  });
});
