import { prisma } from '@archi/db';
import { Roles, type Role } from '@archi/shared';

/** 테스트 간 DB 초기화. FK 순서를 고려해 TRUNCATE CASCADE 사용 */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

let seq = 0;

/** 사용자 + 조직 + 워크스페이스 + 멤버십 생성 헬퍼 */
export async function createUserWithWorkspace(role: Role = Roles.OWNER) {
  seq += 1;
  const user = await prisma.user.create({
    data: { email: `user${seq}-${Date.now()}@test.local`, name: `테스트사용자${seq}` },
  });
  const organization = await prisma.organization.create({
    data: {
      name: `테스트조직${seq}`,
      workspaces: { create: { name: '기본 워크스페이스' } },
      members: { create: { userId: user.id, role } },
    },
    include: { workspaces: true },
  });
  const workspace = organization.workspaces[0];
  if (!workspace) throw new Error('워크스페이스 생성 실패');
  return { user, organization, workspace };
}

/** 기존 조직에 다른 역할의 사용자 추가 */
export async function addMember(organizationId: string, role: Role) {
  seq += 1;
  const user = await prisma.user.create({
    data: { email: `member${seq}-${Date.now()}@test.local`, name: `멤버${seq}` },
  });
  await prisma.membership.create({ data: { userId: user.id, organizationId, role } });
  return user;
}
