import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * API 키 등 비밀값 저장용 AES-256-GCM 암호화.
 * 키는 AUTH_SECRET에서 유도한다. 프로덕션에서는 KMS/secret manager 사용을 권장 (SECURITY_REVIEW 백로그).
 */

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? 'dev-secret-change-me';
  return createHash('sha256').update(`archi-llm-key:${secret}`).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('잘못된 암호화 데이터 형식입니다.');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** UI 표시용 마스킹: 끝 4자리만 노출 */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return '••••';
  return `••••${plaintext.slice(-4)}`;
}
