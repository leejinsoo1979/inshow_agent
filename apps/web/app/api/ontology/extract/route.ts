import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@archi/shared';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { extractFromDocument, extractFromKnowledgeSource } from '@/lib/services/ontology';

const extractSchema = z.object({
  documentId: z.string().optional(),
  sourceId: z.string().optional(),
});

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = extractSchema.parse(await parseJsonBody(request));
  if (body.documentId) {
    const stats = await extractFromDocument(user.id, body.documentId);
    return NextResponse.json(stats, { status: 201 });
  }
  if (body.sourceId) {
    const stats = await extractFromKnowledgeSource(user.id, body.sourceId);
    return NextResponse.json(stats, { status: 201 });
  }
  throw new AppError(ErrorCodes.VALIDATION_FAILED, {
    message: 'documentId 또는 sourceId가 필요합니다.',
  });
});
