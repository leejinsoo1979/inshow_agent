import { beforeEach, describe, expect, it } from 'vitest';
import { createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument } from './documents';
import { createTask } from './tasks';
import { getDashboard } from './dashboard';

beforeEach(async () => {
  await resetDb();
});

describe('대시보드 집계', () => {
  it('카운트와 최근 문서, 진행 중 업무를 반환한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '현장 A' });
    await createDocument(user.id, { projectId: project.id, title: '문서 1', type: 'REPORT', withTemplate: true });
    await createDocument(user.id, { projectId: project.id, title: '문서 2', type: 'BLOG_POST' });
    await createTask(user.id, { workspaceId: workspace.id, title: '검수 요청', requiresReview: true });

    const dash = await getDashboard(user.id, workspace.id);
    expect(dash.counts.projects).toBe(1);
    expect(dash.counts.documents).toBe(2);
    expect(dash.counts.openTasks).toBe(1);
    expect(dash.recentDocuments[0]!.title).toBe('문서 2'); // 최근 수정 순
    expect(dash.recentDocuments.map((d) => d.title)).toContain('문서 1');
    expect(dash.openTasks[0]!.title).toBe('검수 요청');
    // 템플릿 문서의 블록 수 포함
    const doc1 = dash.recentDocuments.find((d) => d.title === '문서 1')!;
    expect(doc1._count.blocks).toBeGreaterThan(5);
  });

  it('비멤버는 대시보드를 볼 수 없다', async () => {
    const { workspace } = await createUserWithWorkspace();
    const outsider = await createUserWithWorkspace();
    await expect(getDashboard(outsider.user.id, workspace.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
