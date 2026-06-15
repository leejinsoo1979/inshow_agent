import { NextResponse } from 'next/server';
import { AppError, ErrorCodes } from '@archi/shared';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { listDevices } from '@/lib/services/companion';

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  if (!workspaceId) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, { message: 'workspaceId가 필요합니다.' });
  }
  return NextResponse.json(await listDevices(user.id, workspaceId));
});
