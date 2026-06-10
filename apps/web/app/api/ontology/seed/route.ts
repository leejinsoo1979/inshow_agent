import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiHandler, parseJsonBody } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { seedSampleOntology } from '@/lib/services/ontology';

const seedSchema = z.object({ workspaceId: z.string().min(1) });

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = seedSchema.parse(await parseJsonBody(request));
  const result = await seedSampleOntology(user.id, body.workspaceId);
  return NextResponse.json(result, { status: 201 });
});
