import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { createNode, createNodeSchema } from '@/lib/services/ontology';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = createNodeSchema.parse(await parseJsonBody(request));
  const node = await createNode(user.id, body);
  return NextResponse.json(node, { status: 201 });
});
