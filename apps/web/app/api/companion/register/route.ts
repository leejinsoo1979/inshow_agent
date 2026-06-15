import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { registerDevice, registerDeviceSchema } from '@/lib/services/companion';

export const POST = apiHandler(async (request) => {
  const body = registerDeviceSchema.parse(await parseJsonBody(request));
  return NextResponse.json(await registerDevice(body));
});
