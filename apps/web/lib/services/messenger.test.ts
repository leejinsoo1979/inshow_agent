import { beforeEach, describe, expect, it } from 'vitest';
import { parseAgentMention } from '@archi/ai';
import { prisma } from '@archi/db';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { createChannel, postMessage } from './messenger';
import { getTask, updateTask } from './tasks';
import { createProject } from './projects';
import { createDocument } from './documents';

beforeEach(async () => {
  await resetDb();
});

describe('@agent mention 파서', () => {
  it('한국어 에이전트 멘션을 파싱한다', () => {
    expect(parseAgentMention('@콘텐츠에이전트 무몰딩 블로그 초안 작성')).toEqual({
      agent: 'content_agent',
      instruction: '무몰딩 블로그 초안 작성',
    });
  });
  it('알 수 없는 멘션이나 지시가 없으면 null', () => {
    expect(parseAgentMention('@누군가 글 좀')).toBeNull();
    expect(parseAgentMention('@콘텐츠에이전트')).toBeNull();
    expect(parseAgentMention('그냥 일반 메시지')).toBeNull();
  });
});

describe('메신저 → Task 생성', () => {
  it('에이전트 멘션 메시지를 보내면 task가 생성되고 시스템 메시지가 남는다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const channel = await createChannel(user.id, { workspaceId: workspace.id, name: '시공팀' });

    const result = await postMessage(user.id, channel.id, {
      text: '@콘텐츠에이전트 무몰딩 인테리어 블로그 초안 작성',
    });

    expect(result.task).not.toBeNull();
    expect(result.task!.assigneeAgent).toBe('content_agent');
    expect(result.task!.title).toBe('무몰딩 인테리어 블로그 초안 작성');
    expect(result.task!.status).toBe('QUEUED');
    expect(result.systemMessage?.text).toContain('콘텐츠 에이전트');

    const events = await prisma.taskEvent.findMany({ where: { taskId: result.task!.id } });
    expect(events.map((e) => e.type)).toContain('created');
  });

  it('일반 메시지는 task를 만들지 않는다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const channel = await createChannel(user.id, { workspaceId: workspace.id, name: '일반' });
    const result = await postMessage(user.id, channel.id, { text: '오늘 현장 사진 공유합니다' });
    expect(result.task).toBeNull();
    expect(result.systemMessage).toBeNull();
  });

  it('task 상태 변경과 산출물 문서 연결이 동작한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const channel = await createChannel(user.id, { workspaceId: workspace.id, name: '업무' });
    const { task } = await postMessage(user.id, channel.id, {
      text: '@콘텐츠에이전트 블로그 초안 작성',
    });

    await updateTask(user.id, task!.id, { status: 'RUNNING' });
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '산출물 초안',
      type: 'BLOG_POST',
    });
    await updateTask(user.id, task!.id, { status: 'DONE', outputDocumentId: doc.id });

    const fetched = await getTask(user.id, task!.id);
    expect(fetched.status).toBe('DONE');
    expect(fetched.outputDocumentId).toBe(doc.id);
    const eventTypes = fetched.events.map((e) => e.type);
    expect(eventTypes).toContain('status_change');
    expect(eventTypes).toContain('output_linked');
  });

  it('다른 워크스페이스 문서는 산출물로 연결할 수 없다', async () => {
    const a = await createUserWithWorkspace();
    const b = await createUserWithWorkspace();
    const channel = await createChannel(a.user.id, { workspaceId: a.workspace.id, name: 'A팀' });
    const { task } = await postMessage(a.user.id, channel.id, {
      text: '@콘텐츠에이전트 초안 작성',
    });
    const bProject = await createProject(b.user.id, { workspaceId: b.workspace.id, name: 'B현장' });
    const bDoc = await createDocument(b.user.id, {
      projectId: bProject.id,
      title: 'B 문서',
      type: 'BLOG_POST',
    });
    await expect(
      updateTask(a.user.id, task!.id, { outputDocumentId: bDoc.id }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('VIEWER는 메시지를 보낼 수 없다', async () => {
    const { user, organization, workspace } = await createUserWithWorkspace();
    const channel = await createChannel(user.id, { workspaceId: workspace.id, name: '공지' });
    const viewer = await addMember(organization.id, Roles.VIEWER);
    await expect(
      postMessage(viewer.id, channel.id, { text: '안녕하세요' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
