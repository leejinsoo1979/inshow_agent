import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { createEdge, createEdgeSchema } from '@/lib/services/ontology';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = createEdgeSchema.parse(await parseJsonBody(request));
  const edge = await createEdge(user.id, body);
  return NextResponse.json(edge, { status: 201 });
});
