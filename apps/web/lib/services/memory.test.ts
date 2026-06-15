import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument } from './documents';
import { buildSessionMemoryContext, summarizeSessionIfNeeded } from './memory';

beforeEach(async () => {
  await resetDb();
});

async function setup() {
  const ctx = await createUserWithWorkspace();
  const project = await createProject(ctx.user.id, {
    workspaceId: ctx.workspace.id,
    name: '메모리 테스트',
  });
  const doc = await createDocument(ctx.user.id, {
    projectId: project.id,
    title: '결로 기술자료',
    type: 'REPORT',
  });
  return { ...ctx, project, doc };
}

async function makeSession(documentId: string, msgs: { role: 'USER' | 'ASSISTANT'; text: string }[]) {
  const session = await prisma.chatSession.create({ data: { documentId, title: '세션' } });
  for (const m of msgs) {
    await prisma.chatMessage.create({
      data: { chatSessionId: session.id, role: m.role, content: { text: m.text } },
    });
  }
  return session;
}

describe('세션 메모리', () => {
  it('대화가 쌓이면 요약을 생성·저장한다 (mock=추출식)', async () => {
    const { workspace, doc } = await setup();
    const session = await makeSession(doc.id, [
      { role: 'USER', text: '결로 방지 단열 기준 정리해줘' },
      { role: 'ASSISTANT', text: '네' },
      { role: 'USER', text: '중부1 지역 외벽 열관류율도 넣어줘' },
      { role: 'ASSISTANT', text: '추가했습니다' },
    ]);
    await summarizeSessionIfNeeded(workspace.id, session.id);
    const updated = await prisma.chatSession.findUnique({ where: { id: session.id } });
    expect(updated!.summary).toBeTruthy();
    expect(updated!.summary).toContain('결로');
    expect(updated!.summaryAt).toBeTruthy();
  });

  it('메시지가 적으면 요약하지 않는다', async () => {
    const { workspace, doc } = await setup();
    const session = await makeSession(doc.id, [{ role: 'USER', text: '안녕' }]);
    await summarizeSessionIfNeeded(workspace.id, session.id);
    const updated = await prisma.chatSession.findUnique({ where: { id: session.id } });
    expect(updated!.summary).toBeNull();
  });

  it('관련 과거 세션 요약을 회상한다 (현재 세션 제외)', async () => {
    const { workspace, doc } = await setup();
    const past = await prisma.chatSession.create({
      data: {
        documentId: doc.id,
        title: '과거 세션',
        summary: '사용자가 결로 방지를 위한 단열재 시공 기준을 정리했다.',
        summaryAt: new Date(),
      },
    });
    const current = await prisma.chatSession.create({ data: { documentId: doc.id, title: '현재' } });

    const ctx = await buildSessionMemoryContext(workspace.id, current.id, '결로 대응 방법 알려줘');
    expect(ctx).toBeTruthy();
    expect(ctx).toContain('단열재 시공');
    expect(ctx).toContain('결로 기술자료'); // 문서 제목 포함

    // 무관한 메시지는 회상 안 함
    const none = await buildSessionMemoryContext(workspace.id, current.id, '점심 메뉴 추천');
    expect(none).toBeUndefined();

    // 현재 세션 자기 자신은 제외 — past를 current로 지정하면 그 요약은 안 나와야 함
    const selfExcluded = await buildSessionMemoryContext(workspace.id, past.id, '결로');
    expect(selfExcluded).toBeUndefined();
  });

  it('다른 워크스페이스 세션은 회상하지 않는다', async () => {
    const a = await setup();
    const b = await setup();
    await prisma.chatSession.create({
      data: { documentId: a.doc.id, title: 'A', summary: '결로 단열 정리', summaryAt: new Date() },
    });
    const bCurrent = await prisma.chatSession.create({ data: { documentId: b.doc.id, title: 'B' } });
    // b 워크스페이스에서 결로를 물어도 a 워크스페이스 세션은 안 나온다
    const ctx = await buildSessionMemoryContext(b.workspace.id, bCurrent.id, '결로');
    expect(ctx).toBeUndefined();
  });
});
