import { prisma, type Prisma } from '@archi/db';
import { blockInputSchema } from '@archi/editor';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireDocumentCapability } from '../authz';
import { writeAuditLog } from '../audit';

export const addBlockSchema = z.object({
  afterBlockId: z.string().optional(),
  block: blockInputSchema,
});

export const updateBlockSchema = z.object({
  content: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const reorderBlocksSchema = z.object({
  blockIds: z.array(z.string()).min(1),
});

/** afterBlockId 뒤에 블록 삽입. 미지정 시 문서 맨 끝에 추가 */
export async function addBlock(
  userId: string,
  documentId: string,
  input: z.infer<typeof addBlockSchema>,
) {
  await requireDocumentCapability(userId, documentId, Capabilities.EDIT_DOCUMENTS);

  const block = await prisma.$transaction(async (tx) => {
    let sortOrder: number;
    if (input.afterBlockId) {
      const after = await tx.documentBlock.findFirst({
        where: { id: input.afterBlockId, documentId },
      });
      if (!after) {
        throw new AppError(ErrorCodes.NOT_FOUND, { message: '기준 블록을 찾을 수 없습니다.' });
      }
      sortOrder = after.sortOrder + 1;
      await tx.documentBlock.updateMany({
        where: { documentId, sortOrder: { gte: sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
    } else {
      const last = await tx.documentBlock.findFirst({
        where: { documentId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }
    return tx.documentBlock.create({
      data: {
        documentId,
        type: input.block.type,
        sortOrder,
        content: input.block.content as Prisma.InputJsonValue,
        metadata: (input.block.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  });

  await writeAuditLog({
    actorId: userId,
    action: 'block.create',
    targetType: 'DocumentBlock',
    targetId: block.id,
    after: { type: block.type, sortOrder: block.sortOrder },
  });
  return block;
}

export async function updateBlock(
  userId: string,
  blockId: string,
  input: z.infer<typeof updateBlockSchema>,
) {
  const existing = await prisma.documentBlock.findUnique({ where: { id: blockId } });
  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '블록을 찾을 수 없습니다.' });
  }
  await requireDocumentCapability(userId, existing.documentId, Capabilities.EDIT_DOCUMENTS);

  if (input.content) {
    const parsed = blockInputSchema.safeParse({ type: existing.type, content: input.content });
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, {
        message: `'${existing.type}' 블록 내용이 올바르지 않습니다.`,
        details: parsed.error.issues,
      });
    }
  }

  const block = await prisma.documentBlock.update({
    where: { id: blockId },
    data: {
      content: input.content as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'block.update',
    targetType: 'DocumentBlock',
    targetId: blockId,
    before: { content: existing.content },
    after: { content: block.content },
  });
  return block;
}

export async function deleteBlock(userId: string, blockId: string) {
  const existing = await prisma.documentBlock.findUnique({ where: { id: blockId } });
  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '블록을 찾을 수 없습니다.' });
  }
  await requireDocumentCapability(userId, existing.documentId, Capabilities.EDIT_DOCUMENTS);
  await prisma.documentBlock.delete({ where: { id: blockId } });
  await writeAuditLog({
    actorId: userId,
    action: 'block.delete',
    targetType: 'DocumentBlock',
    targetId: blockId,
    before: { type: existing.type, content: existing.content },
  });
  return { deleted: true };
}

/** 전체 블록 id 배열을 받아 순서를 재정렬 */
export async function reorderBlocks(
  userId: string,
  documentId: string,
  input: z.infer<typeof reorderBlocksSchema>,
) {
  await requireDocumentCapability(userId, documentId, Capabilities.EDIT_DOCUMENTS);

  const blocks = await prisma.documentBlock.findMany({
    where: { documentId },
    select: { id: true },
  });
  const existingIds = new Set(blocks.map((b) => b.id));
  if (
    input.blockIds.length !== existingIds.size ||
    !input.blockIds.every((id) => existingIds.has(id))
  ) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, {
      message: '블록 순서 목록이 문서의 블록과 일치하지 않습니다.',
    });
  }

  await prisma.$transaction(
    input.blockIds.map((id, index) =>
      prisma.documentBlock.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  await writeAuditLog({
    actorId: userId,
    action: 'block.reorder',
    targetType: 'Document',
    targetId: documentId,
    after: { blockIds: input.blockIds },
  });
  return prisma.documentBlock.findMany({
    where: { documentId },
    orderBy: { sortOrder: 'asc' },
  });
}
