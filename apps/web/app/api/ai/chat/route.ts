import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { chat, chatRequestSchema } from '@/lib/services/agent';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = chatRequestSchema.parse(await parseJsonBody(request));
  const result = await chat(user.id, body);
  return NextResponse.json(result);
});
