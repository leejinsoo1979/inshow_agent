import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { agentActionSchema } from '@archi/ai';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument, getDocument } from './documents';
import { addBlock } from './blocks';
import { approveAction, buildKnowledgeContext, chat, rejectAction } from './agent';

beforeEach(async () => {
  await resetDb();
});

async function setupDocument() {
  const ctx = await createUserWithWorkspace();
  const project = await createProject(ctx.user.id, {
    workspaceId: ctx.workspace.id,
    name: '34평 아파트 리모델링',
  });
  const doc = await createDocument(ctx.user.id, {
    projectId: project.id,
    title: '34평 아파트 거실 리모델링',
    type: 'BLOG_POST',
  });
  return { ...ctx, project, doc };
}

describe('AgentAction schema', () => {
  it('allowlist에 없는 action_type은 거부된다', () => {
    const result = agentActionSchema.safeParse({
      action_type: 'delete_document',
      target: { documentId: 'doc_1' },
      payload: {},
      requires_approval: false,
      risk_level: 'high',
    });
    expect(result.success).toBe(false);
  });

  it('insert_blocks는 블록 스키마까지 검증한다', () => {
    const result = agentActionSchema.safeParse({
      action_type: 'insert_blocks',
      target: { documentId: 'doc_1' },
      payload: { blocks: [{ type: 'heading', content: { text: '레벨 없음' } }] },
      requires_approval: true,
      risk_level: 'low',
    });
    expect(result.success).toBe(false);
  });
});

describe('replace_block_content / append_to_block 액션', () => {
  it('append_to_block 승인 시 블록 텍스트에 이어쓴다', async () => {
    const { user, doc } = await setupDocument();
    const block = await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '첫 줄' } },
    });
    const action = await prisma.agentAction.create({
      data: {
        documentId: doc.id,
        type: 'append_to_block',
        payload: {
          action_type: 'append_to_block',
          target: { documentId: doc.id, blockId: block.id },
          payload: { text: '둘째 줄' },
          requires_approval: true,
          risk_level: 'low',
        },
        riskLevel: 'low',
        requiresApproval: true,
      },
    });
    const approved = await approveAction(user.id, action.id);
    expect(approved.status).toBe('EXECUTED');
    const fetched = await getDocument(user.id, doc.id);
    const text = (fetched.blocks.find((b) => b.id === block.id)!.content as { text: string }).text;
    expect(text).toContain('첫 줄');
    expect(text).toContain('둘째 줄');
  });

  it('replace_block_content 승인 시 블록 내용을 통째로 교체한다', async () => {
    const { user, doc } = await setupDocument();
    const block = await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '원본' } },
    });
    const action = await prisma.agentAction.create({
      data: {
        documentId: doc.id,
        type: 'replace_block_content',
        payload: {
          action_type: 'replace_block_content',
          target: { documentId: doc.id, blockId: block.id },
          payload: { content: { text: '교체본' } },
          requires_approval: true,
          risk_level: 'medium',
        },
        riskLevel: 'medium',
        requiresApproval: true,
      },
    });
    await approveAction(user.id, action.id);
    const fetched = await getDocument(user.id, doc.id);
    const text = (fetched.blocks.find((b) => b.id === block.id)!.content as { text: string }).text;
    expect(text).toBe('교체본');
  });
});

describe('RAG 지식 컨텍스트(buildKnowledgeContext)', () => {
  it('승인된 노드만, 메시지에 언급된 라벨만 컨텍스트로 만든다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    await prisma.ontologyNode.createMany({
      data: [
        { workspaceId: workspace.id, label: '결로', type: 'defect', status: 'APPROVED', description: '표면 응결' },
        { workspaceId: workspace.id, label: '단열재', type: 'material', status: 'APPROVED' },
        { workspaceId: workspace.id, label: '몰딩', type: 'material', status: 'CANDIDATE' }, // 후보(미승인)
      ],
    });
    void user;

    const ctx = await buildKnowledgeContext(workspace.id, '결로 방지 방법 알려줘');
    expect(ctx).toBeTruthy();
    expect(ctx).toContain('결로');
    expect(ctx).toContain('표면 응결');
    // 언급 안 된 승인 노드는 제외
    expect(ctx).not.toContain('단열재');

    // 승인 안 된(후보) 노드는 언급돼도 제외
    const ctx2 = await buildKnowledgeContext(workspace.id, '몰딩 시공');
    expect(ctx2).toBeUndefined();

    // 관련 없는 메시지는 undefined
    const ctx3 = await buildKnowledgeContext(workspace.id, '안녕하세요');
    expect(ctx3).toBeUndefined();
  });
});

describe('create_container 액션', () => {
  it('컨테이너와 자식 블록을 parentId로 연결해 생성한다', async () => {
    const { user, doc } = await setupDocument();
    const action = await prisma.agentAction.create({
      data: {
        documentId: doc.id,
        type: 'create_container',
        payload: {
          action_type: 'create_container',
          target: { documentId: doc.id },
          payload: {
            title: '단열두께 설계 기준',
            children: [
              { type: 'paragraph', content: { text: '개요' } },
              { type: 'formula', content: { expression: 'U = 1 / Rtotal', variables: [] } },
            ],
          },
          requires_approval: true,
          risk_level: 'low',
        },
        riskLevel: 'low',
        requiresApproval: true,
      },
    });
    await approveAction(user.id, action.id);

    const blocks = await prisma.documentBlock.findMany({
      where: { documentId: doc.id },
      orderBy: { sortOrder: 'asc' },
    });
    const container = blocks.find((b) => b.type === 'container');
    expect(container).toBeTruthy();
    expect((container!.content as { title: string }).title).toBe('단열두께 설계 기준');
    const children = blocks.filter((b) => b.parentId === container!.id);
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.type)).toEqual(['paragraph', 'formula']);
  });
});

describe('AI chat → action 승인 플로우', () => {
  it('블로그 초안 요청 시 insert_blocks 액션이 제안되고, 승인 시 블록이 삽입된다', async () => {
    const { user, doc } = await setupDocument();

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '블로그 초안 작성해줘',
    });

    expect(result.actions).toHaveLength(1);
    const action = result.actions[0]!;
    expect(action.type).toBe('insert_blocks');
    expect(action.status).toBe('PROPOSED');

    // 승인 전에는 문서가 비어 있어야 한다 (사용자 승인 없이 문서 변경 금지)
    let fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks).toHaveLength(0);

    const approved = await approveAction(user.id, action.id);
    expect(approved.status).toBe('EXECUTED');

    fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks.length).toBeGreaterThanOrEqual(5);
    expect(fetched.blocks[0]!.type).toBe('heading');

    // 실행 전후 감사 로그 확인
    const logs = await prisma.auditLog.findMany({
      where: { targetType: 'AgentAction', targetId: action.id },
    });
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('agent_action.approve');
    expect(actions).toContain('agent_action.execute');
  });

  it('거절하면 문서가 변경되지 않는다', async () => {
    const { user, doc } = await setupDocument();
    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '블로그 초안 작성해줘',
    });
    const rejected = await rejectAction(user.id, result.actions[0]!.id);
    expect(rejected.status).toBe('REJECTED');

    const fetched = await getDocument(user.id, doc.id);
    expect(fetched.blocks).toHaveLength(0);

    // 이미 처리된 액션은 다시 승인 불가
    await expect(approveAction(user.id, result.actions[0]!.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('선택 블록 수정 요청 시 update_block 액션이 제안되고 승인 시 반영된다', async () => {
    const { user, doc } = await setupDocument();
    const block = await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '이번 현장은 거실 구조를 개선했습니다' } },
    });

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [block.id],
      message: '이 문단을 전문가 톤으로 바꿔줘',
    });
    expect(result.actions[0]!.type).toBe('update_block');

    await approveAction(user.id, result.actions[0]!.id);
    const fetched = await getDocument(user.id, doc.id);
    const content = fetched.blocks[0]!.content as { text: string };
    expect(content.text).toContain('시공 품질');
  });

  it('VIEWER는 AI 사용이 불가하고, 액션 승인도 불가하다', async () => {
    const { user, organization, doc } = await setupDocument();
    const viewer = await addMember(organization.id, Roles.VIEWER);

    await expect(
      chat(viewer.id, { documentId: doc.id, selectedBlockIds: [], message: '블로그 초안 작성해줘' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '블로그 초안 작성해줘',
    });
    await expect(approveAction(viewer.id, result.actions[0]!.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
