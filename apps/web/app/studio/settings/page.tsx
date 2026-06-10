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
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  custom: 'Custom',
};

export default function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  const loadConfigs = useCallback((wsId: string) => {
    apiFetch<{ configs: LlmConfig[] }>(`/api/settings/llm?workspaceId=${wsId}`)
      .then((data) => setConfigs(data.configs))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) loadConfigs(workspaceId);
  }, [workspaceId, loadConfigs]);

  // OAuth 콜백 결과 표시
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'connected') {
      setNotice('Claude 계정이 연결되었습니다. 이제 AI 에이전트가 실제 모델로 응답합니다.');
    } else if (oauth === 'error') {
      setError(`Claude 계정 연결 실패: ${params.get('reason') ?? '알 수 없는 오류'}`);
    }
    if (oauth) {
      window.history.replaceState(null, '', '/studio/settings');
    }
  }, []);

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

          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800">Claude 계정으로 연결 (OAuth)</h2>
            <p className="mb-4 text-xs text-zinc-500">
              API 키 없이 Claude 계정(Pro/Max 구독)으로 로그인해 에이전트를 연결합니다. 토큰은
              암호화 저장되며 만료 시 자동 갱신됩니다.
            </p>
            <button
              onClick={() => {
                if (workspaceId) {
                  window.location.href = `/api/settings/llm/oauth/anthropic/start?workspaceId=${workspaceId}`;
                }
              }}
              disabled={!workspaceId || busy}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Claude 계정으로 연결 →
            </button>
            <p className="mt-2 text-[11px] text-zinc-400">
              ANTHROPIC_OAUTH_CLIENT_ID 환경변수가 설정되어 있어야 합니다 (Anthropic의 “Sign in
              with Claude” 베타 클라이언트).
            </p>
          </section>

          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800">에이전트 LLM API 등록</h2>
            <p className="mb-4 text-xs text-zinc-500">
              API 키는 암호화되어 저장되며 화면에는 끝 4자리만 표시됩니다. 등록하면 AI
              에이전트가 mock 대신 실제 모델로 초안을 생성합니다. (관리자 전용)
            </p>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (등록만, 어댑터 예정)</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="모델 (예: claude-sonnet-4-6)"
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API 키 (예: sk-ant-...)"
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
