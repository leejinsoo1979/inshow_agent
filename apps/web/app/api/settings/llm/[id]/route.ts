import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { deleteLlmConfig } from '@/lib/services/llm-config';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = apiHandler<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const result = await deleteLlmConfig(user.id, id);
  return NextResponse.json(result);
});
