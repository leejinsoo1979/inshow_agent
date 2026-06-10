'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/client/api';
import { NavRail } from '@/components/studio/NavRail';

type Me = {
  organizations: { workspaces: { id: string; name: string }[] }[];
};

type Source = {
  id: string;
  title: string;
  status: string;
  trustLevel: string;
  error: string | null;
  _count: { chunks: number };
};

type Chunk = { id: string; chunkIndex: number; text: string; section: string | null };

type QueryResult = {
  answer: string;
  citations: { sourceId: string; chunkId: string; title: string; quote: string; score: number }[];
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING_PROCESSING: { label: '처리 대기', cls: 'bg-zinc-100 text-zinc-600' },
  PROCESSING: { label: '처리 중', cls: 'bg-zinc-200 text-zinc-700' },
  PENDING_REVIEW: { label: '검토 대기', cls: 'bg-zinc-300 text-zinc-800' },
  APPROVED: { label: '승인됨', cls: 'bg-zinc-900 text-white' },
  FAILED: { label: '실패', cls: 'bg-red-100 text-red-700' },
  ARCHIVED: { label: '보관됨', cls: 'bg-zinc-100 text-zinc-500' },
};

export default function KnowledgePage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chunksFor, setChunksFor] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  const loadSources = useCallback((wsId: string) => {
    apiFetch<{ sources: Source[] }>(`/api/kb/sources?workspaceId=${wsId}`)
      .then((data) => setSources(data.sources))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) loadSources(workspaceId);
  }, [workspaceId, loadSources]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('workspaceId', workspaceId);
      const response = await fetch('/api/kb/sources', { method: 'POST', body: form });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? '업로드에 실패했습니다.');
      }
      if (fileRef.current) fileRef.current.value = '';
      loadSources(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(sourceId: string, action: 'process' | 'approve') {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/kb/sources/${sourceId}/${action}`, { method: 'POST' });
      loadSources(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleShowChunks(sourceId: string) {
    if (chunksFor === sourceId) {
      setChunksFor(null);
      return;
    }
    try {
      const data = await apiFetch<{ chunks: Chunk[] }>(`/api/kb/sources/${sourceId}/chunks`);
      setChunks(data.chunks);
      setChunksFor(sourceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<QueryResult>('/api/kb/query', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, query: query.trim() }),
      });
      setQueryResult(result);
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
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">지식베이스</h1>
            <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-900">
              ← 스튜디오
            </Link>
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">파일 업로드 (PDF/TXT/MD)</h2>
            <form onSubmit={handleUpload} className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="text-sm" />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                업로드
              </button>
            </form>
            <p className="mt-2 text-xs text-zinc-400">
              업로드 후 ‘처리’를 실행하면 텍스트 추출과 청킹이 진행되고, 검토 승인 후 검색에
              사용됩니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">소스 목록</h2>
            {sources.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
                아직 등록된 지식 소스가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {sources.map((source) => {
                  const status = STATUS_LABELS[source.status] ?? {
                    label: source.status,
                    cls: 'bg-zinc-100 text-zinc-600',
                  };
                  return (
                    <li key={source.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">{source.title}</span>
                        <span className="text-xs text-zinc-400">청크 {source._count.chunks}개</span>
                        {source.status === 'PENDING_PROCESSING' || source.status === 'FAILED' ? (
                          <button
                            onClick={() => handleAction(source.id, 'process')}
                            disabled={busy}
                            className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                          >
                            처리
                          </button>
                        ) : null}
                        {source.status === 'PENDING_REVIEW' && (
                          <button
                            onClick={() => handleAction(source.id, 'approve')}
                            disabled={busy}
                            className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                          >
                            승인
                          </button>
                        )}
                        {source._count.chunks > 0 && (
                          <button
                            onClick={() => handleShowChunks(source.id)}
                            className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600"
                          >
                            청크 {chunksFor === source.id ? '닫기' : '보기'}
                          </button>
                        )}
                      </div>
                      {source.error && <p className="mt-2 text-xs text-red-500">{source.error}</p>}
                      {chunksFor === source.id && (
                        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-zinc-100 pt-3">
                          {chunks.map((chunk) => (
                            <li key={chunk.id} className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
                              <span className="mr-2 font-semibold text-zinc-400">
                                #{chunk.chunkIndex}
                                {chunk.section ? ` · ${chunk.section}` : ''}
                              </span>
                              {chunk.text.slice(0, 200)}
                              {chunk.text.length > 200 && '…'}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">지식베이스 질의</h2>
            <form onSubmit={handleQuery} className="mb-4 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 욕실 방수 담수 테스트 순서"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !query.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                질문
              </button>
            </form>
            {queryResult && (
              <div>
                <p className="mb-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm leading-6">
                  {queryResult.answer}
                </p>
                {queryResult.citations.length > 0 && (
                  <ul className="space-y-2">
                    {queryResult.citations.map((citation) => (
                      <li
                        key={citation.chunkId}
                        className="rounded-lg border-l-4 border-zinc-400 bg-zinc-50 p-3 text-xs"
                      >
                        <p className="font-semibold text-zinc-800">
                          {citation.title}
                          <span className="ml-2 font-normal text-zinc-500">
                            관련도 {(citation.score * 100).toFixed(0)}%
                          </span>
                        </p>
                        <p className="mt-1 text-zinc-600">{citation.quote}…</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
