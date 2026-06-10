import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getImageVersionFile } from '@/lib/services/images';

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const file = await getImageVersionFile(user.id, id);
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});
