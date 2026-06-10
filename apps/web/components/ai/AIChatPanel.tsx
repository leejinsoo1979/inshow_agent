'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client/api';

type ActionPreview = {
  id: string;
  type: string;
  payload: unknown;
  riskLevel: string;
  requiresApproval: boolean;
  status: string;
};

type ChatItem =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; streaming?: boolean }
  | { kind: 'actions'; actions: ActionPreview[] };

type Props = {
  documentId: string;
  selectedBlockId: string | null;
  onDocumentChanged: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  insert_blocks: '블록 삽입',
  update_block: '블록 수정',
};

export function AIChatPanel({ documentId, selectedBlockId, onDocumentChanged }: Props) {
  const [items, setItems] = useState<ChatItem[]>([
    {
      kind: 'assistant',
      text: '안녕하세요, ARCHI 에이전트입니다. 블로그 초안 작성이나 블록 수정을 도와드릴게요. 블록을 선택한 뒤 "전문가 톤으로 바꿔줘"처럼 요청할 수도 있습니다.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items]);

  /** mock stream: 응답 텍스트를 타자기 효과로 표시 */
  function streamAssistantText(text: string): Promise<void> {
    return new Promise((resolve) => {
      setItems((prev) => [...prev, { kind: 'assistant', text: '', streaming: true }]);
      let i = 0;
      const timer = setInterval(() => {
        i += 3;
        const slice = text.slice(0, i);
        setItems((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.kind === 'assistant') {
            next[next.length - 1] = { kind: 'assistant', text: slice, streaming: i < text.length };
          }
          return next;
        });
        if (i >= text.length) {
          clearInterval(timer);
          resolve();
        }
      }, 20);
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setError(null);
    setBusy(true);
    setItems((prev) => [...prev, { kind: 'user', text: message }]);
    try {
      const result = await apiFetch<{
        chatSessionId: string;
        reply: { text: string };
        actions: ActionPreview[];
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          chatSessionId: sessionId,
          documentId,
          selectedBlockIds: selectedBlockId ? [selectedBlockId] : [],
          message,
        }),
      });
      setSessionId(result.chatSessionId);
      await streamAssistantText(result.reply.text);
      if (result.actions.length > 0) {
        setItems((prev) => [...prev, { kind: 'actions', actions: result.actions }]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(actionId: string, decision: 'approve' | 'reject') {
    setError(null);
    try {
      await apiFetch(`/api/ai/actions/${actionId}/${decision}`, { method: 'POST' });
      setItems((prev) =>
        prev.map((item) =>
          item.kind === 'actions'
            ? {
                ...item,
                actions: item.actions.map((a) =>
                  a.id === actionId
                    ? { ...a, status: decision === 'approve' ? 'EXECUTED' : 'REJECTED' }
                    : a,
                ),
              }
            : item,
        ),
      );
      if (decision === 'approve') onDocumentChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#1c1c2a] text-zinc-100">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold">
          AI
        </span>
        <div>
          <p className="text-sm font-semibold">AI 에이전트</p>
          <p className="text-[11px] text-zinc-400">
            {selectedBlockId ? '블록 선택됨 · 수정 요청 가능' : '문서 전체 모드'}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.map((item, i) => {
          if (item.kind === 'user') {
            return (
              <div key={i} className="ml-8 rounded-2xl rounded-tr-sm bg-violet-600 px-3.5 py-2.5 text-sm">
                {item.text}
              </div>
            );
          }
          if (item.kind === 'assistant') {
            return (
              <div key={i} className="mr-6 rounded-2xl rounded-tl-sm bg-white/5 px-3.5 py-2.5 text-sm leading-6">
                {item.text}
                {item.streaming && <span className="animate-pulse">▍</span>}
              </div>
            );
          }
          return (
            <div key={i} className="mr-4 space-y-2">
              {item.actions.map((action) => (
                <div key={action.id} className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-300">
                      {ACTION_LABELS[action.type] ?? action.type}
                    </span>
                    <span className="text-[10px] uppercase text-zinc-400">
                      위험도 {action.riskLevel}
                    </span>
                  </div>
                  <ActionPayloadPreview type={action.type} payload={action.payload} />
                  {action.status === 'PROPOSED' ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleAction(action.id, 'approve')}
                        className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-semibold hover:bg-violet-500"
                      >
                        승인하고 적용
                      </button>
                      <button
                        onClick={() => handleAction(action.id, 'reject')}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
                      >
                        거절
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">
                      {action.status === 'EXECUTED' ? '✓ 문서에 적용되었습니다' : '거절되었습니다'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {busy && <p className="text-xs text-zinc-500">에이전트가 작업 중...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <form onSubmit={handleSend} className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2 rounded-xl bg-white/5 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e);
              }
            }}
            rows={2}
            placeholder="AI에게 요청하기... (예: 블로그 초안 작성해줘)"
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionPayloadPreview({ type, payload }: { type: string; payload: unknown }) {
  if (type === 'insert_blocks') {
    const p = payload as { payload?: { blocks?: { type: string; content: { text?: string; title?: string } }[] } };
    const blocks = p.payload?.blocks ?? [];
    return (
      <ul className="space-y-1 text-xs text-zinc-300">
        {blocks.slice(0, 5).map((b, i) => (
          <li key={i} className="truncate">
            <span className="text-zinc-500">{b.type}</span>{' '}
            {b.content.text ?? b.content.title ?? ''}
          </li>
        ))}
        {blocks.length > 5 && <li className="text-zinc-500">…외 {blocks.length - 5}개 블록</li>}
      </ul>
    );
  }
  if (type === 'update_block') {
    const p = payload as { payload?: { content?: { text?: string } } };
    return <p className="line-clamp-3 text-xs text-zinc-300">{p.payload?.content?.text ?? ''}</p>;
  }
  return null;
}
