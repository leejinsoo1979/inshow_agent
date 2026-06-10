import { beforeEach, describe, expect, it } from 'vitest';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import {
  createEdge,
  createNode,
  getGraph,
  seedSampleOntology,
  updateNode,
} from './ontology';

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
