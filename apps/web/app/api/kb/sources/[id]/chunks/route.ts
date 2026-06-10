import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { listKnowledgeChunks } from '@/lib/services/knowledge';

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const chunks = await listKnowledgeChunks(user.id, id);
  return NextResponse.json({ chunks });
});
