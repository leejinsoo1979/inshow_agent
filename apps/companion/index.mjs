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
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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

const TIMEOUT_MS = Number(process.env.ARCHI_COMPANION_TIMEOUT || 180_000);

/** prompt를 받아 도구 CLI를 비대화 모드로 실행하고 최종 텍스트를 반환 */
function runTool(tool, prompt) {
  return new Promise((resolve) => {
    let cmd;
    let args;
    let outFile = null;
    if (process.env.ARCHI_COMPANION_CMD) {
      const parts = process.env.ARCHI_COMPANION_CMD.split(' ');
      cmd = parts[0];
      args = [...parts.slice(1), prompt];
    } else if (tool === 'claude') {
      cmd = 'claude';
      args = ['-p', prompt];
    } else {
      // codex 비대화 실행: stdin 대기 방지(아래 stdio), git 미신뢰 디렉터리 허용,
      // read-only 샌드박스(셸 실행/수정 없음), 최종 메시지는 파일로 추출.
      outFile = join(tmpdir(), `archi-codex-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
      cmd = 'codex';
      args = ['exec', '--skip-git-repo-check', '-s', 'read-only', '-o', outFile, prompt];
    }
    // stdin은 닫는다(codex가 stdin을 읽으며 멈추지 않도록)
    const child = spawn(cmd, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let done = false;
    const finish = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (outFile) {
        try {
          if (existsSync(outFile)) unlinkSync(outFile);
        } catch {
          /* ignore */
        }
      }
      resolve(payload);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({
        error: `시간 초과(${TIMEOUT_MS / 1000}s). codex가 응답하지 않습니다 — 'codex login'(구독 로그인)이 되어 있는지 확인하세요.`,
      });
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      if (e.code === 'ENOENT') {
        finish({ error: `'${cmd}' 명령을 찾을 수 없습니다. CLI 설치 및 로그인(codex login) 후 다시 시도하세요.` });
      } else {
        finish({ error: String(e.message || e) });
      }
    });
    child.on('close', (codeNum) => {
      // codex는 -o 파일의 '최종 메시지'가 가장 깔끔하다. 없으면 stdout 사용.
      let fileText = '';
      if (outFile && existsSync(outFile)) {
        try {
          fileText = readFileSync(outFile, 'utf8').trim();
        } catch {
          /* ignore */
        }
      }
      if (codeNum === 0) {
        finish({ result: fileText || out.trim() || '(빈 출력)' });
      } else {
        finish({ error: (err || fileText || out).trim().slice(0, 3000) || `종료 코드 ${codeNum}` });
      }
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
