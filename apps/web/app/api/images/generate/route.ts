import { NextResponse } from 'next/server';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { generateImage, generateImageSchema } from '@/lib/services/images';

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = generateImageSchema.parse(await parseJsonBody(request));
  const result = await generateImage(user.id, body);
  return NextResponse.json(result, { status: 201 });
});
