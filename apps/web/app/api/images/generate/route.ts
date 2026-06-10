import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { generateImage, generateImageSchema } from '@/lib/services/images';

import { checkRateLimit } from '@/lib/rate-limit';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  checkRateLimit(`image-generate:${user.id}`, 10, 60_000);
  const body = generateImageSchema.parse(await parseJsonBody(request));
  const result = await generateImage(user.id, body);
  return NextResponse.json(result, { status: 201 });
});
