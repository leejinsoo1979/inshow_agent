#!/usr/bin/env node
/**
 * ARCHI 로컬 컴패니언 워커 (헤르메스식 사이드카).
 *
 * 사용법:
 *   1) 웹 설정 → "기기 연결"에서 6자리 페어링 코드 발급
 *   2) node apps/companion/index.mjs pair <코드> [--url http://localhost:3001] [--name "맥북"]
 *   3) node apps/companion/index.mjs run        # 작업 폴링 시작
 *
 * 의존성 없음(Node 내장 fetch/child_process/fs만 사용).
 * 토큰은 사용자 머신(~/.archi-companion.json)에만 저장된다. 웹/서버에는 평문 토큰이 없다.
 *
 * 도구 실행:
 *   - tool=codex  → `codex exec "<prompt>"`
 *   - tool=claude → `claude -p "<prompt>"`
 *   - ARCHI_COMPANION_CMD 로 실행 명령 override 가능(테스트용, 예: echo)
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_PATH = join(homedir(), '.archi-companion.json');
const DEFAULT_URL = process.env.ARCHI_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 3000;

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}
function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') out.url = args[++i];
    else if (args[i] === '--name') out.name = args[++i];
    else if (!out._pos) out._pos = args[i];
  }
  return out;
}

async function register(code, flags) {
  const url = (flags.url || DEFAULT_URL).replace(/\/$/, '');
  const res = await fetch(`${url}/api/companion/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pairCode: code, name: flags.name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`등록 실패 (${res.status}): ${body.error?.message ?? body.message ?? ''}`);
    process.exit(1);
  }
  saveConfig({ url, deviceToken: body.deviceToken, deviceId: body.deviceId, name: body.name });
  console.log(`✅ 기기 연결 완료: ${body.name} (${body.deviceId})`);
  console.log(`   이제 'node apps/companion/index.mjs run' 으로 워커를 실행하세요.`);
}

/** prompt를 받아 도구 CLI를 실행하고 stdout을 반환 */
function runTool(tool, prompt) {
  return new Promise((resolve) => {
    let cmd;
    let args;
    if (process.env.ARCHI_COMPANION_CMD) {
      const parts = process.env.ARCHI_COMPANION_CMD.split(' ');
      cmd = parts[0];
      args = [...parts.slice(1), prompt];
    } else if (tool === 'claude') {
      cmd = 'claude';
      args = ['-p', prompt];
    } else {
      cmd = 'codex';
      args = ['exec', prompt];
    }
    const child = spawn(cmd, args, { env: process.env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      if (e.code === 'ENOENT') {
        resolve({ error: `'${cmd}' 명령을 찾을 수 없습니다. CLI 설치 및 로그인(예: codex login) 후 다시 시도하세요.` });
      } else {
        resolve({ error: String(e.message || e) });
      }
    });
    child.on('close', (codeNum) => {
      if (codeNum === 0) resolve({ result: out.trim() || '(빈 출력)' });
      else resolve({ error: (err || out).trim().slice(0, 3000) || `종료 코드 ${codeNum}` });
    });
  });
}

async function pollLoop() {
  const cfg = loadConfig();
  if (!cfg?.deviceToken) {
    console.error('연결된 기기가 없습니다. 먼저 pair <코드> 로 등록하세요.');
    process.exit(1);
  }
  const headers = { authorization: `Bearer ${cfg.deviceToken}`, 'content-type': 'application/json' };
  console.log(`🟢 컴패니언 실행 중 — ${cfg.url} (${cfg.name}). ${POLL_INTERVAL_MS / 1000}s마다 작업 확인.`);

  for (;;) {
    try {
      const res = await fetch(`${cfg.url}/api/companion/jobs/next`, { headers });
      if (res.status === 401) {
        console.error('인증 실패. 기기를 다시 연결하세요.');
        process.exit(1);
      }
      const data = await res.json().catch(() => ({}));
      const job = data.job;
      if (job) {
        console.log(`▶ 작업 ${job.id} (${job.tool}) 실행: ${job.prompt.slice(0, 60)}…`);
        const outcome = await runTool(job.tool, job.prompt);
        await fetch(`${cfg.url}/api/companion/jobs/${job.id}/result`, {
          method: 'POST',
          headers,
          body: JSON.stringify(outcome),
        });
        console.log(outcome.error ? `  ✗ 실패: ${outcome.error.slice(0, 80)}` : `  ✓ 완료`);
        continue; // 바로 다음 작업 확인
      }
    } catch (e) {
      console.error('폴링 오류:', String(e.message || e));
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

const [, , command, ...rest] = process.argv;
const flags = parseFlags(rest);
if (command === 'pair') {
  const code = flags._pos;
  if (!code) {
    console.error('사용법: node index.mjs pair <페어링코드> [--url URL] [--name 이름]');
    process.exit(1);
  }
  await register(code, flags);
} else if (command === 'run' || command === undefined) {
  await pollLoop();
} else {
  console.error('알 수 없는 명령. 사용: pair <코드> | run');
  process.exit(1);
}
