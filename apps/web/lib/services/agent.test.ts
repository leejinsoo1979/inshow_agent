import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { agentActionSchema } from '@archi/ai';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument, getDocument } from './documents';
import { addBlock } from './blocks';
import { approveAction, chat, rejectAction } from './agent';

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
