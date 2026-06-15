import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enqueueJob, enqueueJobSchema } from '@/lib/services/companion';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = enqueueJobSchema.parse(await parseJsonBody(request));
  return NextResponse.json(await enqueueJob(user.id, body));
});
