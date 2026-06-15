import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { claimNextJob, deviceTokenFrom } from '@/lib/services/companion';

export const GET = apiHandler(async (request) => {
  const token = deviceTokenFrom(request);
  return NextResponse.json(await claimNextJob(token));
});
