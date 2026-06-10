import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * 로컬 디렉터리 기반 object storage mock.
 * 실제 배포 시 S3 호환 스토리지 어댑터로 교체한다.
 */

let repoRootCache: string | null = null;

/** npm workspace root(= docker-compose.yml이 있는 곳)를 찾는다. cwd가 apps/web일 수도 있다 */
export function findRepoRoot(): string {
  if (repoRootCache) return repoRootCache;
  let dir = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    if (existsSync(path.join(dir, 'docker-compose.yml')) || existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      repoRootCache = dir;
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  repoRootCache = process.cwd();
  return repoRootCache;
}

function storageRoot(): string {
  const configured = process.env.STORAGE_DIR ?? '.storage';
  return path.isAbsolute(configured) ? configured : path.join(findRepoRoot(), configured);
}

/** key는 'exports/abc.pdf' 같은 상대 경로. 경로 탈출 방지 */
function resolveKey(key: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('잘못된 storage key 입니다.');
  }
  return resolved;
}

export async function saveStorageFile(key: string, data: Uint8Array): Promise<string> {
  const filePath = resolveKey(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return key;
}

export async function readStorageFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** packages/export/fonts의 한글 폰트 로드 */
export async function loadKoreanFontBytes(): Promise<Uint8Array | undefined> {
  const fontPath = path.join(findRepoRoot(), 'packages/export/fonts/NotoSansKR-Regular.otf');
  try {
    return await readFile(fontPath);
  } catch {
    console.warn('[export] 한글 폰트를 찾지 못했습니다. PDF 한글이 깨질 수 있습니다:', fontPath);
    return undefined;
  }
}
