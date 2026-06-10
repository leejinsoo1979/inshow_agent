import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { processKnowledgeSource } from '@/lib/services/knowledge';

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const result = await processKnowledgeSource(user.id, id);
  return NextResponse.json(result);
});
