import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { reorderBlocks, reorderBlocksSchema } from '@/lib/services/blocks';

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = reorderBlocksSchema.parse(await parseJsonBody(request));
  const blocks = await reorderBlocks(user.id, id, body);
  return NextResponse.json({ blocks });
});
