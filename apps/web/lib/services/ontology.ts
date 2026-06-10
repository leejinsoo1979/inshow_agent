import { prisma, type Prisma } from '@archi/db';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireWorkspaceCapability } from '../authz';
import { writeAuditLog } from '../audit';

export const createNodeSchema = z.object({
  workspaceId: z.string().min(1),
  label: z.string().min(1, '노드 이름을 입력해 주세요.').max(200),
  type: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const updateNodeSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['CANDIDATE', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
});

export const createEdgeSchema = z.object({
  workspaceId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  relationType: z.string().min(1).max(100),
  confidence: z.number().min(0).max(1).optional(),
});

/** 후보 노드 생성은 편집 권한이면 가능 (AI 추출 후보 포함) */
export async function createNode(userId: string, input: z.infer<typeof createNodeSchema>) {
  await requireWorkspaceCapability(userId, input.workspaceId, Capabilities.EDIT_DOCUMENTS);
  const node = await prisma.ontologyNode.create({
    data: {
      workspaceId: input.workspaceId,
      label: input.label,
      type: input.type,
      description: input.description,
      confidence: input.confidence,
      status: 'CANDIDATE',
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'ontology_node.create',
    targetType: 'OntologyNode',
    targetId: node.id,
    after: { label: node.label, type: node.type },
  });
  return node;
}

/** 상태 변경(승인 등)은 EDIT_ONTOLOGY 권한 필요 — 관리자만 가능 */
export async function updateNode(
  userId: string,
  nodeId: string,
  input: z.infer<typeof updateNodeSchema>,
) {
  const node = await prisma.ontologyNode.findUnique({ where: { id: nodeId } });
  if (!node) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '온톨로지 노드를 찾을 수 없습니다.' });
  }
  const capability = input.status ? Capabilities.EDIT_ONTOLOGY : Capabilities.EDIT_DOCUMENTS;
  await requireWorkspaceCapability(userId, node.workspaceId, capability);

  const updated = await prisma.ontologyNode.update({ where: { id: nodeId }, data: input });
  await writeAuditLog({
    actorId: userId,
    action: input.status ? 'ontology_node.status_change' : 'ontology_node.update',
    targetType: 'OntologyNode',
    targetId: nodeId,
    before: { status: node.status, label: node.label },
    after: { status: updated.status, label: updated.label },
  });
  return updated;
}

export async function createEdge(userId: string, input: z.infer<typeof createEdgeSchema>) {
  await requireWorkspaceCapability(userId, input.workspaceId, Capabilities.EDIT_DOCUMENTS);
  const [source, target] = await Promise.all([
    prisma.ontologyNode.findFirst({
      where: { id: input.sourceNodeId, workspaceId: input.workspaceId },
    }),
    prisma.ontologyNode.findFirst({
      where: { id: input.targetNodeId, workspaceId: input.workspaceId },
    }),
  ]);
  if (!source || !target) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, {
      message: '엣지의 양쪽 노드가 같은 워크스페이스에 있어야 합니다.',
    });
  }
  const edge = await prisma.ontologyEdge.create({
    data: {
      workspaceId: input.workspaceId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      relationType: input.relationType,
      confidence: input.confidence,
      status: 'CANDIDATE',
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'ontology_edge.create',
    targetType: 'OntologyEdge',
    targetId: edge.id,
    after: { relationType: edge.relationType },
  });
  return edge;
}

export async function getGraph(
  userId: string,
  workspaceId: string,
  statusFilter: 'approved' | 'candidate' | 'all' = 'all',
) {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.VIEW_DOCUMENTS);
  const statusWhere =
    statusFilter === 'all'
      ? { status: { in: ['CANDIDATE', 'APPROVED'] as ('CANDIDATE' | 'APPROVED')[] } }
      : { status: statusFilter === 'approved' ? ('APPROVED' as const) : ('CANDIDATE' as const) };

  const nodes = await prisma.ontologyNode.findMany({
    where: { workspaceId, ...statusWhere },
    orderBy: { createdAt: 'asc' },
  });
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = await prisma.ontologyEdge.findMany({
    where: { workspaceId, status: { in: ['CANDIDATE', 'APPROVED'] } },
  });
  return {
    nodes,
    edges: edges.filter((e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)),
  };
}

const SAMPLE_NODES: { key: string; label: string; type: string; description: string }[] = [
  { key: 'living', label: '거실', type: 'space', description: '주요 생활 공간' },
  { key: 'bathroom', label: '욕실', type: 'space', description: '방수가 중요한 습식 공간' },
  { key: 'no_molding', label: '무몰딩', type: 'method', description: '몰딩 없이 면을 정리하는 마감 공법' },
  { key: 'waterproof', label: '도막방수', type: 'method', description: '욕실 바닥/벽 방수 공법' },
  { key: 'condensation', label: '결로', type: 'defect', description: '단열 불량 시 발생하는 하자' },
  { key: 'insulation', label: '단열재', type: 'material', description: '결로 방지 핵심 자재' },
  { key: 'firedoor', label: '방화문', type: 'material', description: '방화구획에 필요한 자재' },
  { key: 'fire_code', label: '건축법 방화규정', type: 'regulation', description: '방화구획·방화문 관련 법규' },
];

const SAMPLE_EDGES: { source: string; target: string; relation: string }[] = [
  { source: 'no_molding', target: 'living', relation: '적용 공간' },
  { source: 'waterproof', target: 'bathroom', relation: '적용 공간' },
  { source: 'insulation', target: 'condensation', relation: '예방' },
  { source: 'condensation', target: 'living', relation: '발생 위치' },
  { source: 'firedoor', target: 'fire_code', relation: '규제 근거' },
  { source: 'waterproof', target: 'condensation', relation: '관련 하자' },
];

/** 샘플 온톨로지 시드 (그래프 뷰어 확인용) */
export async function seedSampleOntology(userId: string, workspaceId: string) {
  await requireWorkspaceCapability(userId, workspaceId, Capabilities.EDIT_DOCUMENTS);
  const existing = await prisma.ontologyNode.count({ where: { workspaceId } });
  if (existing > 0) {
    throw new AppError(ErrorCodes.CONFLICT, {
      message: '이미 온톨로지 노드가 있어 샘플을 생성하지 않았습니다.',
    });
  }
  const idByKey = new Map<string, string>();
  for (const sample of SAMPLE_NODES) {
    const node = await prisma.ontologyNode.create({
      data: {
        workspaceId,
        label: sample.label,
        type: sample.type,
        description: sample.description,
        status: 'CANDIDATE',
        confidence: 0.9,
        metadata: { seed: true } as Prisma.InputJsonValue,
      },
    });
    idByKey.set(sample.key, node.id);
  }
  for (const sample of SAMPLE_EDGES) {
    await prisma.ontologyEdge.create({
      data: {
        workspaceId,
        sourceNodeId: idByKey.get(sample.source)!,
        targetNodeId: idByKey.get(sample.target)!,
        relationType: sample.relation,
        status: 'CANDIDATE',
        confidence: 0.85,
      },
    });
  }
  await writeAuditLog({
    actorId: userId,
    action: 'ontology.seed',
    targetType: 'Workspace',
    targetId: workspaceId,
    after: { nodes: SAMPLE_NODES.length, edges: SAMPLE_EDGES.length },
  });
  return { nodes: SAMPLE_NODES.length, edges: SAMPLE_EDGES.length };
}
