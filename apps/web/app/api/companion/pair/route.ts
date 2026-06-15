import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { pairDevice, pairDeviceSchema } from '@/lib/services/companion';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = pairDeviceSchema.parse(await parseJsonBody(request));
  return NextResponse.json(await pairDevice(user.id, body));
});
