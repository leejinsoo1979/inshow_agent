import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { approveKnowledgeSource } from '@/lib/services/knowledge';

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const source = await approveKnowledgeSource(user.id, id);
  return NextResponse.json(source);
});
