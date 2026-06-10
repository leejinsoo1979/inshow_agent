import { prisma } from '@archi/db';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireDocumentCapability, requireProjectCapability } from '../authz';
import { writeAuditLog } from '../audit';

export const createDocumentSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, '문서 제목을 입력해 주세요.').max(300),
  type: z
    .enum(['BLOG_POST', 'PROPOSAL', 'REPORT', 'SNS_CAPTION', 'KNOWLEDGE_NOTE'])
    .default('BLOG_POST'),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1, '문서 제목을 입력해 주세요.').max(300).optional(),
  status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
});

export async function createDocument(userId: string, input: z.infer<typeof createDocumentSchema>) {
  await requireProjectCapability(userId, input.projectId, Capabilities.EDIT_DOCUMENTS);
  const document = await prisma.document.create({
    data: { projectId: input.projectId, title: input.title, type: input.type },
    include: { blocks: true },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'document.create',
    targetType: 'Document',
    targetId: document.id,
    after: { title: document.title, type: document.type },
  });
  return document;
}

export async function getDocument(userId: string, documentId: string) {
  await requireDocumentCapability(userId, documentId, Capabilities.VIEW_DOCUMENTS);
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { blocks: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!document) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '문서를 찾을 수 없습니다.' });
  }
  return document;
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: z.infer<typeof updateDocumentSchema>,
) {
  await requireDocumentCapability(userId, documentId, Capabilities.EDIT_DOCUMENTS);
  const before = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, status: true },
  });
  const document = await prisma.document.update({
    where: { id: documentId },
    data: input,
    include: { blocks: { orderBy: { sortOrder: 'asc' } } },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'document.update',
    targetType: 'Document',
    targetId: documentId,
    before: before ?? undefined,
    after: { title: document.title, status: document.status },
  });
  return document;
}

export async function listDocuments(userId: string, projectId: string) {
  await requireProjectCapability(userId, projectId, Capabilities.VIEW_DOCUMENTS);
  return prisma.document.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, type: true, status: true, updatedAt: true },
  });
}
