import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { deviceTokenFrom, submitJobResult, submitResultSchema } from '@/lib/services/companion';

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const token = deviceTokenFrom(request);
  const body = submitResultSchema.parse(await parseJsonBody(request));
  return NextResponse.json(await submitJobResult(token, id, body));
});
