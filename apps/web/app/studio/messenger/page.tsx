'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/client/api';
import { NavRail } from '@/components/studio/NavRail';

type Me = { organizations: { workspaces: { id: string; name: string }[] }[] };
type Channel = { id: string; name: string };
type Message = { id: string; authorType: string; text: string; createdAt: string };
type Task = {
  id: string;
  title: string;
  assigneeAgent: string | null;
  status: string;
  outputDocumentId: string | null;
};

const TASK_STATUS_LABELS: Record<string, string> = {
  QUEUED: '대기',
  RUNNING: '진행 중',
  BLOCKED: '차단됨',
  NEEDS_REVIEW: '검토 필요',
  DONE: '완료',
  FAILED: '실패',
  CANCELED: '취소',
};

const AGENT_LABELS: Record<string, string> = {
  content_agent: '콘텐츠',
  image_agent: '이미지',
  legal_agent: '법규',
  knowledge_agent: '지식',
};

export default function MessengerPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  const loadChannels = useCallback((wsId: string) => {
    apiFetch<{ channels: Channel[] }>(`/api/channels?workspaceId=${wsId}`)
      .then((data) => {
        setChannels(data.channels);
        setChannelId((prev) => prev ?? data.channels[0]?.id ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadTasks = useCallback((wsId: string) => {
    apiFetch<{ tasks: Task[] }>(`/api/tasks?workspaceId=${wsId}`)
      .then((data) => setTasks(data.tasks))
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadMessages = useCallback((chId: string) => {
    apiFetch<{ messages: Message[] }>(`/api/channels/${chId}/messages`)
      .then((data) => setMessages(data.messages))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) {
      loadChannels(workspaceId);
      loadTasks(workspaceId);
    }
  }, [workspaceId, loadChannels, loadTasks]);

  useEffect(() => {
    if (channelId) loadMessages(channelId);
  }, [channelId, loadMessages]);

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !newChannel.trim()) return;
    try {
      const channel = await apiFetch<Channel>('/api/channels', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, name: newChannel.trim() }),
      });
      setNewChannel('');
      loadChannels(workspaceId);
      setChannelId(channel.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId || !text.trim() || !workspaceId) return;
    try {
      await apiFetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      });
      setText('');
      loadMessages(channelId);
      loadTasks(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleTaskStatus(taskId: string, status: string) {
    if (!workspaceId) return;
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadTasks(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleLinkOutput(taskId: string) {
    const documentId = linkDrafts[taskId]?.trim();
    if (!documentId || !workspaceId) return;
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ outputDocumentId: documentId }),
      });
      setLinkDrafts((prev) => ({ ...prev, [taskId]: '' }));
      loadTasks(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />

      {/* 채널 목록 */}
      <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">채널</h2>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                onClick={() => setChannelId(channel.id)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-sm ${
                  channelId === channel.id
                    ? 'bg-zinc-100 font-semibold text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                # {channel.name}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateChannel} className="border-t border-zinc-200 p-2">
          <input
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            placeholder="새 채널 이름"
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </form>
      </aside>

      {/* 메시지 영역 */}
      <main className="flex min-w-0 flex-1 flex-col bg-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <h1 className="font-semibold">
            {channels.find((c) => c.id === channelId)?.name
              ? `# ${channels.find((c) => c.id === channelId)?.name}`
              : '메신저'}
          </h1>
          <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← 스튜디오
          </Link>
        </div>
        {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {!channelId ? (
            <p className="pt-10 text-center text-sm text-zinc-400">
              채널을 만들고 «@콘텐츠에이전트 블로그 초안 작성» 처럼 멘션해 업무를 지시해 보세요.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-xl rounded-xl px-3.5 py-2 text-sm ${
                  message.authorType === 'system'
                    ? 'mx-auto bg-zinc-200 text-zinc-700'
                    : 'bg-white shadow-sm'
                }`}
              >
                {message.text}
              </div>
            ))
          )}
        </div>
        {channelId && (
          <form onSubmit={handleSend} className="border-t border-zinc-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='메시지 입력... (예: "@콘텐츠에이전트 무몰딩 블로그 초안 작성")'
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Task Center */}
      <aside className="flex w-80 flex-col border-l border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Task Center</h2>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {tasks.length === 0 && (
            <p className="pt-6 text-center text-xs text-zinc-400">아직 업무가 없습니다.</p>
          )}
          {tasks.map((task) => (
            <li key={task.id} className="rounded-xl border border-zinc-200 p-3">
              <p className="mb-1 text-sm font-medium leading-5">{task.title}</p>
              <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                {task.assigneeAgent && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
                    {AGENT_LABELS[task.assigneeAgent] ?? task.assigneeAgent}
                  </span>
                )}
                <select
                  value={task.status}
                  onChange={(e) => handleTaskStatus(task.id, e.target.value)}
                  className="rounded border border-zinc-200 px-1 py-0.5 text-xs"
                >
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {task.outputDocumentId ? (
                <Link
                  href={`/studio/${task.outputDocumentId}`}
                  className="text-xs font-semibold text-zinc-900 underline hover:text-zinc-600"
                >
                  산출물 문서 열기 →
                </Link>
              ) : (
                <div className="flex gap-1">
                  <input
                    value={linkDrafts[task.id] ?? ''}
                    onChange={(e) =>
                      setLinkDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    placeholder="문서 ID 연결"
                    className="min-w-0 flex-1 rounded border border-zinc-200 px-1.5 py-1 text-xs"
                  />
                  <button
                    onClick={() => handleLinkOutput(task.id)}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
                  >
                    연결
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
