'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';

type Me = {
  user: { id: string; email: string; name: string | null };
  organizations: {
    organizationId: string;
    organizationName: string;
    role: string;
    workspaces: { id: string; name: string }[];
  }[];
};

type Project = { id: string; name: string; _count?: { documents: number } };
type DocumentSummary = { id: string; title: string; type: string; status: string };

export default function StudioPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('BLOG_POST');
  const [withTemplate, setWithTemplate] = useState(true);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((data) => {
        setMe(data);
        const ws = data.organizations[0]?.workspaces[0];
        if (ws) setWorkspaceId(ws.id);
      })
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const loadProjects = useCallback((wsId: string) => {
    apiFetch<{ projects: Project[] }>(`/api/projects?workspaceId=${wsId}`)
      .then((data) => setProjects(data.projects))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) loadProjects(workspaceId);
  }, [workspaceId, loadProjects]);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<{ documents: DocumentSummary[] }>(`/api/documents?projectId=${projectId}`)
      .then((data) => setDocuments(data.documents))
      .catch((e: Error) => setError(e.message));
  }, [projectId]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await apiFetch<Me>('/api/auth/me');
      setMe(data);
      const ws = data.organizations[0]?.workspaces[0];
      if (ws) setWorkspaceId(ws.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !newProjectName.trim()) return;
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, name: newProjectName.trim() }),
      });
      setNewProjectName('');
      loadProjects(workspaceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !newDocTitle.trim()) return;
    try {
      const doc = await apiFetch<{ id: string }>('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: newDocTitle.trim(),
          type: newDocType,
          withTemplate,
        }),
      });
      router.push(`/studio/${doc.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) {
    return <main className="p-10 text-zinc-500">불러오는 중...</main>;
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-sm p-10">
        <h1 className="mb-6 text-2xl font-bold">ARCHI Agent Studio 로그인</h1>
        <a
          href="/login"
          className="mb-3 block rounded-lg bg-zinc-900 py-2.5 text-center font-semibold text-white hover:bg-zinc-700"
        >
          소셜 계정으로 로그인
        </a>
        <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          또는 개발용 이메일 로그인
          <span className="h-px flex-1 bg-zinc-200" />
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            type="text"
            placeholder="이름 (선택)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-zinc-900 py-2 text-white">
            시작하기
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="mb-1 text-2xl font-bold">스튜디오</h1>
      <p className="mb-8 text-sm text-zinc-500">
        {me.user.name ?? me.user.email} · {me.organizations[0]?.organizationName}
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">프로젝트</h2>
        {projects.length === 0 && (
          <p className="mb-3 text-sm text-zinc-500">
            아직 프로젝트가 없습니다. 첫 프로젝트를 만들어 보세요.
          </p>
        )}
        <ul className="mb-4 flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setProjectId(p.id)}
                className={`w-full rounded-lg border px-4 py-2 text-left ${
                  projectId === p.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white hover:border-zinc-400'
                }`}
              >
                {p.name}
                {p._count != null && (
                  <span className="ml-2 text-xs opacity-60">문서 {p._count.documents}개</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateProject} className="flex gap-2">
          <input
            placeholder="새 프로젝트 이름 (예: 34평 아파트 리모델링)"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 text-white">
            만들기
          </button>
        </form>
      </section>

      {projectId && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">문서</h2>
          {documents.length === 0 && (
            <p className="mb-3 text-sm text-zinc-500">
              이 프로젝트에 문서가 없습니다. 새 문서를 만들어 보세요.
            </p>
          )}
          <ul className="mb-4 flex flex-col gap-2">
            {documents.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => router.push(`/studio/${d.id}`)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-left hover:border-zinc-400"
                >
                  {d.title}
                  <span className="ml-2 text-xs text-zinc-400">
                    {d.type} · {d.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleCreateDocument} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                placeholder="새 문서 제목"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
              />
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              >
                <option value="BLOG_POST">블로그</option>
                <option value="PROPOSAL">제안서</option>
                <option value="REPORT">기술자료/보고서</option>
                <option value="SNS_CAPTION">SNS 캡션</option>
                <option value="KNOWLEDGE_NOTE">지식 노트</option>
              </select>
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 text-white">
                문서 만들기
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={withTemplate}
                onChange={(e) => setWithTemplate(e.target.checked)}
              />
              문서 유형에 맞는 블록 템플릿으로 시작 (문서코드·법규·계산식·표 등 자동 구성)
            </label>
          </form>
        </section>
      )}
    </main>
  );
}
