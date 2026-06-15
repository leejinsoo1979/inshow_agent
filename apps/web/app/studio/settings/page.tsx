'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/client/api';
import { NavRail } from '@/components/studio/NavRail';

type Me = { organizations: { workspaces: { id: string; name: string }[] }[] };

type LlmConfig = {
  id: string;
  provider: string;
  authType: string;
  model: string | null;
  baseUrl: string | null;
  maskedApiKey: string;
  isActive: boolean;
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  grok: 'xAI (Grok)',
  custom: 'Custom',
};


export default function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLive, setModelsLive] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 컴패니언(로컬 워커) 기기 연결
  const [devices, setDevices] = useState<{ id: string; name: string; status: string; lastSeenAt: string | null }[]>([]);
  const [pairInfo, setPairInfo] = useState<{ pairCode: string } | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  // OAuth 계정 연동 콜백 결과(?oauth=success|error) 표시
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') setNotice('계정이 연결되었습니다. 이제 연결된 계정으로 응답합니다.');
    else if (oauth === 'error') setError(params.get('reason') || '계정 연결에 실패했습니다.');
    if (oauth) window.history.replaceState({}, '', '/studio/settings');
  }, []);

  function connectAccount(p: 'openai' | 'anthropic') {
    if (!workspaceId) return;
    window.location.href = `/api/settings/llm/oauth/${p}/start?workspaceId=${workspaceId}`;
  }

  const loadDevices = useCallback((wsId: string) => {
    apiFetch<{ devices: typeof devices }>(`/api/companion/devices?workspaceId=${wsId}`)
      .then((d) => setDevices(d.devices))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (workspaceId) loadDevices(workspaceId);
  }, [workspaceId, loadDevices]);

  async function handleAddDevice() {
    if (!workspaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ pairCode: string }>('/api/companion/pair', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, name: '내 컴퓨터' }),
      });
      setPairInfo({ pairCode: r.pairCode });
      loadDevices(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTestRun() {
    if (!workspaceId || testBusy || !testPrompt.trim()) return;
    setTestBusy(true);
    setTestResult(null);
    setError(null);
    try {
      const { jobId } = await apiFetch<{ jobId: string }>('/api/companion/jobs', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, prompt: testPrompt.trim(), tool: 'codex' }),
      });
      // 결과 폴링 (최대 60초)
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const job = await apiFetch<{ status: string; result?: string; error?: string }>(
          `/api/companion/jobs/${jobId}`,
        );
        if (job.status === 'DONE') {
          setTestResult(job.result || '(빈 출력)');
          break;
        }
        if (job.status === 'FAILED') {
          setTestResult(`실패: ${job.error ?? ''}`);
          break;
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestBusy(false);
    }
  }

  const loadConfigs = useCallback((wsId: string) => {
    apiFetch<{ configs: LlmConfig[] }>(`/api/settings/llm?workspaceId=${wsId}`)
      .then((data) => setConfigs(data.configs))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) loadConfigs(workspaceId);
  }, [workspaceId, loadConfigs]);

  // provider 선택/키 등록 시 모델 목록을 서버에서 가져온다 (라이브 우선, 실패 시 폴백)
  useEffect(() => {
    if (!workspaceId || provider === 'custom') {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    apiFetch<{ models: string[]; live: boolean }>(
      `/api/settings/llm/models?workspaceId=${workspaceId}&provider=${provider}`,
    )
      .then((data) => {
        if (cancelled) return;
        setModels(data.models);
        setModelsLive(data.live);
        setCustomModel(false);
        setModel((prev) => (data.models.includes(prev) ? prev : (data.models[0] ?? '')));
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, provider, configs]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !apiKey.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/settings/llm', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          provider,
          apiKey: apiKey.trim(),
          model: model.trim() || undefined,
        }),
      });
      setApiKey('');
      setNotice('LLM API가 등록되었습니다. 이제 AI 에이전트가 실제 모델로 응답합니다.');
      loadConfigs(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(configId: string) {
    if (!workspaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/settings/llm/${configId}`, { method: 'DELETE' });
      loadConfigs(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />
      <main className="flex-1 overflow-y-auto bg-zinc-50 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">설정</h1>
            <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-900">
              ← 스튜디오
            </Link>
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {notice && <p className="mb-4 text-sm text-zinc-700">{notice}</p>}

          {/* 계정 연동 (Codex/ChatGPT · Claude OAuth) */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800">AI 에이전트 계정 연동</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Codex(ChatGPT)·Claude 계정으로 로그인해 연동합니다. 연동하면 API 키 없이 계정 기반으로
              동작합니다. (계정 연결에는 관리자의 OAuth 클라이언트 설정이 필요할 수 있습니다.)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['openai', 'Codex / ChatGPT'],
                  ['anthropic', 'Claude'],
                ] as const
              ).map(([p, label]) => {
                const linked = configs.find((c) => c.provider === p && c.authType === 'oauth');
                return (
                  <div
                    key={p}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800">{label}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {linked ? '● 연결됨' : '○ 미연결'}
                        {linked?.model ? ` · ${linked.model}` : ''}
                      </p>
                    </div>
                    {linked ? (
                      <button
                        onClick={() => handleDelete(linked.id)}
                        disabled={busy}
                        className="shrink-0 rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-900 disabled:opacity-50"
                      >
                        연결 해제
                      </button>
                    ) : (
                      <button
                        onClick={() => connectAccount(p)}
                        disabled={!workspaceId}
                        className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                      >
                        계정으로 연결
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 기기 연결 (로컬 컴패니언 워커 — Codex/Claude 구독 CLI) */}
          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800">기기 연결 (로컬 워커)</h2>
            <p className="mb-3 text-xs text-zinc-500">
              내 컴퓨터에서 도는 워커를 연결하면 <b>Codex/Claude 구독 계정 CLI</b>로 작업을 실행합니다
              (헤르메스 방식). 토큰은 내 컴퓨터에만 저장됩니다.
            </p>

            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={handleAddDevice}
                disabled={busy || !workspaceId}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                + 기기 추가 (페어링 코드)
              </button>
              {devices.length > 0 && (
                <span className="text-[11px] text-zinc-400">연결된 기기 {devices.length}대</span>
              )}
            </div>

            {pairInfo && (
              <div className="mb-3 rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-xs">
                <p className="mb-1 text-zinc-600">아래 코드로 내 컴퓨터에서 워커를 연결하세요 (10분 유효):</p>
                <p className="mb-2 font-mono text-2xl font-bold tracking-widest text-zinc-900">
                  {pairInfo.pairCode}
                </p>
                <pre className="overflow-x-auto rounded bg-zinc-900 px-3 py-2 text-[11px] text-zinc-100">
{`node apps/companion/index.mjs pair ${pairInfo.pairCode} --url ${typeof window !== 'undefined' ? window.location.origin : ''}
node apps/companion/index.mjs run`}
                </pre>
                <p className="mt-1 text-zinc-500">워커 머신에서 미리 <code>codex login</code>(또는 claude 로그인)을 해두세요.</p>
              </div>
            )}

            {devices.length > 0 && (
              <ul className="mb-3 space-y-1">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-zinc-800">{d.name}</span>
                    <span className={d.status === 'ACTIVE' ? 'text-zinc-600' : 'text-zinc-400'}>
                      {d.status === 'ACTIVE' ? '● 연결됨' : '○ 대기(페어링)'}
                      {d.lastSeenAt ? ` · ${new Date(d.lastSeenAt).toLocaleString('ko-KR')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {devices.some((d) => d.status === 'ACTIVE') && (
              <div className="mt-3 border-t border-zinc-100 pt-3">
                <p className="mb-1.5 text-[11px] font-semibold text-zinc-600">Codex 테스트 실행</p>
                <div className="flex gap-2">
                  <input
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="예: 단열 기준 한 줄 요약"
                    className="flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm"
                  />
                  <button
                    onClick={handleTestRun}
                    disabled={testBusy || !testPrompt.trim()}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {testBusy ? '실행 중…' : '실행'}
                  </button>
                </div>
                {testResult && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                    {testResult}
                  </pre>
                )}
              </div>
            )}
          </section>

          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800">에이전트 LLM API 등록</h2>
            <p className="mb-4 text-xs text-zinc-500">
              OpenAI(GPT), Anthropic(Claude), Google(Gemini), xAI(Grok) API 키를 등록합니다. API 키는 암호화되어
              저장되며 화면에는 끝 4자리만 표시됩니다. 등록하면 AI 에이전트가 mock 대신 실제
              모델로 응답합니다. (관리자 전용)
            </p>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setCustomModel(e.target.value === 'custom');
                  }}
                  className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                >
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="grok">xAI (Grok)</option>
                  <option value="custom">Custom</option>
                </select>
                {!customModel && provider !== 'custom' && models.length > 0 ? (
                  <select
                    value={model}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomModel(true);
                        setModel('');
                      } else {
                        setModel(e.target.value);
                      }
                    }}
                    className="flex-1 rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__custom__">직접 입력…</option>
                  </select>
                ) : (
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={modelsLoading ? '모델 불러오는 중...' : '모델 ID 직접 입력'}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                )}
              </div>
              {provider !== 'custom' && (
                <p className="-mt-1 text-[11px] text-zinc-400">
                  {modelsLoading
                    ? '모델 목록을 불러오는 중...'
                    : modelsLive
                      ? '✓ 등록된 키로 조회한 실시간 모델 목록입니다.'
                      : '키 등록 전이라 기본 목록을 표시합니다. 키를 등록하면 실제 사용 가능한 모델로 갱신됩니다.'}
                </p>
              )}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API 키"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !apiKey.trim()}
                className="self-end rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                등록
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">등록된 API</h2>
            {configs.length === 0 ? (
              <p className="text-sm text-zinc-400">
                등록된 LLM API가 없습니다. 현재 에이전트는 mock provider로 동작합니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {configs.map((config) => (
                  <li
                    key={config.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">
                      {PROVIDER_LABELS[config.provider] ?? config.provider}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        config.authType === 'oauth'
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {config.authType === 'oauth' ? 'OAuth 계정' : 'API 키'}
                    </span>
                    <span className="text-zinc-500">{config.model ?? '기본 모델'}</span>
                    <span className="font-mono text-xs text-zinc-400">{config.maskedApiKey}</span>
                    <button
                      onClick={() => handleDelete(config.id)}
                      disabled={busy}
                      className="ml-auto text-xs text-zinc-400 hover:text-red-600 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
