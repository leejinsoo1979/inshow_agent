import { beforeEach, describe, expect, it } from 'vitest';
import { createUserWithWorkspace, resetDb } from '../test/testdb';
import {
  claimNextJob,
  enqueueJob,
  getCompanionJob,
  listDevices,
  pairDevice,
  registerDevice,
  submitJobResult,
} from './companion';

beforeEach(async () => {
  await resetDb();
});

describe('컴패니언 워커 연동', () => {
  it('페어링 → 등록 → 작업 큐 → 폴링 → 결과 제출 전체 흐름', async () => {
    const { user, workspace } = await createUserWithWorkspace();

    // 1) 관리자: 페어링 코드 발급
    const { deviceId, pairCode } = await pairDevice(user.id, { workspaceId: workspace.id, name: '맥북' });
    expect(pairCode).toMatch(/^\d{6}$/);

    // 2) 워커: 코드로 등록 → 토큰
    const reg = await registerDevice({ pairCode });
    expect(reg.deviceId).toBe(deviceId);
    expect(reg.deviceToken).toBeTruthy();

    // 등록 후 기기는 ACTIVE
    const { devices } = await listDevices(user.id, workspace.id);
    expect(devices[0]!.status).toBe('ACTIVE');

    // 3) 관리자: 작업 큐 추가
    const { jobId } = await enqueueJob(user.id, {
      workspaceId: workspace.id,
      prompt: '단열 기준 요약',
      tool: 'codex',
    });

    // 4) 워커: 다음 작업 가져오기(RUNNING)
    const claimed = await claimNextJob(reg.deviceToken);
    expect(claimed.job?.id).toBe(jobId);
    expect(claimed.job?.prompt).toBe('단열 기준 요약');

    // 5) 워커: 결과 제출
    await submitJobResult(reg.deviceToken, jobId, { result: '단열재 두께 100mm 권장' });

    // 6) 관리자: 결과 조회
    const job = await getCompanionJob(user.id, jobId);
    expect(job.status).toBe('DONE');
    expect(job.result).toContain('100mm');
  });

  it('만료/오류 코드로는 등록되지 않는다', async () => {
    await expect(registerDevice({ pairCode: '000000' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('잘못된 디바이스 토큰은 거부된다', async () => {
    await expect(claimNextJob('bogus-token')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('연결된 기기가 없으면 작업을 큐에 넣지 못한다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    await expect(
      enqueueJob(user.id, { workspaceId: workspace.id, prompt: 'x', tool: 'codex' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('워커는 자기 워크스페이스 작업만 가져간다', async () => {
    const a = await createUserWithWorkspace();
    const b = await createUserWithWorkspace();
    const { pairCode } = await pairDevice(a.user.id, { workspaceId: a.workspace.id, name: 'A기기' });
    const regA = await registerDevice({ pairCode });
    // b 워크스페이스에 작업을 넣으려면 b 기기가 필요 → b 기기 등록
    const pairB = await pairDevice(b.user.id, { workspaceId: b.workspace.id, name: 'B기기' });
    await registerDevice({ pairCode: pairB.pairCode });
    await enqueueJob(b.user.id, { workspaceId: b.workspace.id, prompt: 'B작업', tool: 'codex' });
    // A 워커는 B 작업을 못 가져온다
    const claimed = await claimNextJob(regA.deviceToken);
    expect(claimed.job).toBeNull();
  });
});
