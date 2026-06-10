import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getUserContext } from '@/lib/services/auth';

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const organizations = await getUserContext(user.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    organizations,
  });
});
