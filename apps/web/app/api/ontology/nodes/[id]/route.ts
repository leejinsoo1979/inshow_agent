import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { updateNode, updateNodeSchema } from '@/lib/services/ontology';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiHandler<Ctx>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = updateNodeSchema.parse(await parseJsonBody(request));
  const node = await updateNode(user.id, id, body);
  return NextResponse.json(node);
});
