import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import {
  createEdge,
  createNode,
  getGraph,
  getNodeDetail,
  seedSampleOntology,
  updateNode,
} from './ontology';
import { createProject } from './projects';
import { createDocument } from './documents';
import { approveAction, chat } from './agent';

beforeEach(async () => {
  await resetDb();
});

describe('온톨로지', () => {
  it('샘플 시드가 그래프로 조회된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const seeded = await seedSampleOntology(user.id, workspace.id);
    expect(seeded.nodes).toBeGreaterThan(0);

    const graph = await getGraph(user.id, workspace.id, 'all');
    expect(graph.nodes.length).toBe(seeded.nodes);
    expect(graph.edges.length).toBe(seeded.edges);
    // 모든 엣지의 양끝이 그래프 노드에 존재
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const edge of graph.edges) {
      expect(ids.has(edge.sourceNodeId)).toBe(true);
      expect(ids.has(edge.targetNodeId)).toBe(true);
    }
  });

  it('관리자는 candidate를 approved로 변경할 수 있다', async () => {
    const { user, workspace } = await createUserWithWorkspace(); // OWNER
    const node = await createNode(user.id, {
      workspaceId: workspace.id,
      label: '무몰딩',
      type: 'method',
    });
    expect(node.status).toBe('CANDIDATE');

    const approved = await updateNode(user.id, node.id, { status: 'APPROVED' });
    expect(approved.status).toBe('APPROVED');

    const graph = await getGraph(user.id, workspace.id, 'approved');
    expect(graph.nodes.map((n) => n.id)).toContain(node.id);
  });

  it('EDITOR는 후보 생성은 가능하지만 승인은 불가하다', async () => {
    const { user, organization, workspace } = await createUserWithWorkspace();
    const editor = await addMember(organization.id, Roles.EDITOR);

    const node = await createNode(editor.id, {
      workspaceId: workspace.id,
      label: '결로',
      type: 'defect',
    });
    await expect(updateNode(editor.id, node.id, { status: 'APPROVED' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    // OWNER는 승인 가능
    const approved = await updateNode(user.id, node.id, { status: 'APPROVED' });
    expect(approved.status).toBe('APPROVED');
  });

  it('AI 액션을 승인하면 실제 문서 내용에서 온톨로지가 자동 누적된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '실데이터 현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '거실 리모델링',
      type: 'BLOG_POST',
    });

    // 승인 전에는 그래프가 비어 있다
    expect((await getGraph(user.id, workspace.id, 'all')).nodes).toHaveLength(0);

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '블로그 초안 작성해줘',
    });
    await approveAction(user.id, result.actions[0]!.id);

    // 승인 실행 → 자동 추출 → 실제 문서 기반 노드 생성 (초안에 결로/무몰딩/거실 등 포함)
    const graph = await getGraph(user.id, workspace.id, 'all');
    expect(graph.nodes.length).toBeGreaterThan(0);
    const labels = graph.nodes.map((n) => n.label);
    expect(labels).toContain('결로');

    // provenance가 실제 문서를 가리킨다
    const node = graph.nodes.find((n) => n.label === '결로')!;
    const meta = node.metadata as { sources: { documentId?: string }[] };
    expect(meta.sources[0]!.documentId).toBe(doc.id);

    // 노드 상세가 관련 문서를 반환한다
    const detail = await getNodeDetail(user.id, node.id);
    expect(detail.documents.map((d) => d.id)).toContain(doc.id);
    expect(detail.extractionCount).toBeGreaterThan(0);
  });

  it('노드 상세는 비멤버에게 숨겨진다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const node = await createNode(user.id, {
      workspaceId: workspace.id,
      label: '방화문',
      type: 'material',
    });
    const outsider = await createUserWithWorkspace();
    await expect(getNodeDetail(outsider.user.id, node.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    // prisma 직접 확인: 노드는 존재한다
    expect(await prisma.ontologyNode.count({ where: { id: node.id } })).toBe(1);
  });

  it('다른 워크스페이스 노드와는 엣지를 만들 수 없다', async () => {
    const a = await createUserWithWorkspace();
    const b = await createUserWithWorkspace();
    const nodeA = await createNode(a.user.id, {
      workspaceId: a.workspace.id,
      label: '단열재',
      type: 'material',
    });
    const nodeB = await createNode(b.user.id, {
      workspaceId: b.workspace.id,
      label: '결로',
      type: 'defect',
    });
    await expect(
      createEdge(a.user.id, {
        workspaceId: a.workspace.id,
        sourceNodeId: nodeA.id,
        targetNodeId: nodeB.id,
        relationType: '예방',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
