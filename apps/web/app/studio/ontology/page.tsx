'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { NavRail } from '@/components/studio/NavRail';
import { GraphView, type GraphEdgeData, type GraphNodeData } from '@/components/ontology/GraphView';

type Me = { organizations: { workspaces: { id: string; name: string }[] }[] };

type GraphNode = GraphNodeData & {
  description: string | null;
  confidence: number | null;
};

type NodeDetail = {
  node: { id: string; label: string; type: string; status: string; confidence: number | null };
  documents: { id: string; title: string; type: string }[];
  knowledgeSources: { id: string; title: string; status: string }[];
  connections: { edgeId: string; relationType: string; direction: string; nodeId: string; label: string }[];
  extractionCount: number;
};

const TYPE_LABELS: Record<string, string> = {
  space: '공간',
  method: '공법',
  material: '자재',
  defect: '하자',
  regulation: '법규',
};

/**
 * 온톨로지 그래프 — 옵시디언 그래프 뷰 스타일.
 * 풀스크린 다크 캔버스 + 우측 플로팅 설정 패널(필터/표시/힘) + 노드 상세 플로팅 카드.
 */
export default function OntologyPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'candidate'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  // 옵시디언 '그래프 설정' 상태
  const [search, setSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [centerForce, setCenterForce] = useState(0.015);
  const [repelForce, setRepelForce] = useState(5200);
  const [linkDistance, setLinkDistance] = useState(110);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  const loadGraph = useCallback((wsId: string, filter: string) => {
    apiFetch<{ nodes: GraphNode[]; edges: GraphEdgeData[] }>(
      `/api/ontology/graph?workspaceId=${wsId}&status=${filter}`,
    )
      .then((graph) => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setSelectedId((prev) => (graph.nodes.some((n) => n.id === prev) ? prev : null));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (workspaceId) loadGraph(workspaceId, statusFilter);
  }, [workspaceId, statusFilter, loadGraph]);

  // 선택 노드의 실제 provenance(관련 문서/지식소스/관계) 로드
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiFetch<NodeDetail>(`/api/ontology/nodes/${selectedId}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleApprove(nodeId: string) {
    if (busy || !workspaceId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/ontology/nodes/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      loadGraph(workspaceId, statusFilter);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const selectedConnections = selected
    ? edges.filter((e) => e.sourceNodeId === selected.id || e.targetNodeId === selected.id)
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#111114]">
      <NavRail />

      <main className="relative min-w-0 flex-1">
        {/* 그래프 캔버스 (풀스크린) */}
        {nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
            <p className="text-sm">아직 지식 그래프가 비어 있습니다.</p>
            <p className="max-w-sm text-center text-xs leading-5 text-zinc-600">
              문서를 작성하고 AI 액션을 승인하거나, 에디터의 ‘지식 추출’ 버튼·지식베이스 업로드를
              실행하면 실제 작업 내용이 노드로 누적됩니다.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => router.push('/studio')}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
              >
                문서 작성하러 가기
              </button>
              <button
                onClick={() => router.push('/studio/knowledge')}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white"
              >
                지식베이스 업로드
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        ) : (
          <GraphView
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={search}
            showLabels={showLabels}
            params={{
              centerStrength: centerForce,
              repulsion: repelForce,
              springLength: linkDistance,
            }}
          />
        )}

        {/* 좌상단: 타이틀/통계 */}
        <div className="pointer-events-none absolute left-4 top-4 text-zinc-400">
          <h1 className="text-sm font-bold text-zinc-100">온톨로지 그래프</h1>
          <p className="text-[11px]">
            노드 {nodes.length} · 관계 {edges.length}
          </p>
          {error && nodes.length > 0 && <p className="text-[11px] text-red-400">{error}</p>}
        </div>

        {/* 우상단: 그래프 설정 패널 (옵시디언 스타일) */}
        <div className="absolute right-4 top-4 w-60">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="mb-1 ml-auto block rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/20"
          >
            그래프 설정 {settingsOpen ? '▾' : '▸'}
          </button>
          {settingsOpen && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#1c1c24]/95 p-4 text-zinc-300 shadow-2xl backdrop-blur">
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  필터
                </p>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="노드 검색..."
                  className="mb-2 w-full rounded-md bg-white/5 px-2.5 py-1.5 text-xs outline-none placeholder:text-zinc-600"
                />
                <div className="flex gap-1">
                  {(
                    [
                      ['all', '전체'],
                      ['approved', '승인'],
                      ['candidate', '후보'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={`flex-1 rounded-md py-1 text-[11px] font-semibold ${
                        statusFilter === value
                          ? 'bg-white text-zinc-900'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  표시
                </p>
                <label className="flex items-center justify-between text-xs">
                  텍스트 라벨
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                </label>
              </section>

              <section className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">힘</p>
                <Slider
                  label="중심 힘"
                  min={0}
                  max={0.06}
                  step={0.003}
                  value={centerForce}
                  onChange={setCenterForce}
                />
                <Slider
                  label="반발력"
                  min={500}
                  max={15000}
                  step={500}
                  value={repelForce}
                  onChange={setRepelForce}
                />
                <Slider
                  label="링크 거리"
                  min={40}
                  max={300}
                  step={10}
                  value={linkDistance}
                  onChange={setLinkDistance}
                />
              </section>
            </div>
          )}
        </div>

        {/* 우하단: 선택 노드 상세 */}
        {selected && (
          <div className="absolute bottom-4 right-4 w-64 rounded-xl border border-white/10 bg-[#1c1c24]/95 p-4 text-zinc-200 shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{selected.label}</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                {TYPE_LABELS[selected.type] ?? selected.type}
              </span>
            </div>
            <p className="mb-1 text-[11px]">
              {selected.status === 'APPROVED' ? (
                <span className="font-semibold text-white">승인됨</span>
              ) : (
                <span className="text-zinc-400">후보</span>
              )}
              {selected.confidence != null && (
                <span className="ml-2 text-zinc-500">
                  신뢰도 {(selected.confidence * 100).toFixed(0)}%
                </span>
              )}
              <span className="ml-2 text-zinc-500">연결 {selectedConnections.length}</span>
              {detail && detail.extractionCount > 0 && (
                <span className="ml-2 text-zinc-500">추출 {detail.extractionCount}회</span>
              )}
            </p>
            {selected.description && (
              <p className="mb-2 text-[11px] leading-4 text-zinc-400">{selected.description}</p>
            )}
            <div className="mb-2 flex flex-wrap gap-1">
              {(detail?.connections ?? []).slice(0, 6).map((connection) => (
                <button
                  key={connection.edgeId}
                  onClick={() => setSelectedId(connection.nodeId)}
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/15 hover:text-white"
                >
                  {connection.relationType} → {connection.label}
                </button>
              ))}
            </div>

            {/* 실제 provenance: 이 노드가 추출된 문서/지식소스 */}
            {detail && detail.documents.length > 0 && (
              <div className="mb-2 border-t border-white/10 pt-2">
                <p className="mb-1 text-[10px] tracking-wide text-zinc-500">
                  관련 문서 {detail.documents.length}
                </p>
                <ul className="space-y-1">
                  {detail.documents.slice(0, 4).map((doc) => (
                    <li key={doc.id}>
                      <button
                        onClick={() => router.push(`/studio/${doc.id}`)}
                        className="w-full truncate rounded bg-white/5 px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-white/15 hover:text-white"
                      >
                        {doc.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail && detail.knowledgeSources.length > 0 && (
              <div className="mb-2 border-t border-white/10 pt-2">
                <p className="mb-1 text-[10px] tracking-wide text-zinc-500">
                  관련 지식소스 {detail.knowledgeSources.length}
                </p>
                <ul className="space-y-1">
                  {detail.knowledgeSources.slice(0, 3).map((source) => (
                    <li key={source.id}>
                      <button
                        onClick={() => router.push('/studio/knowledge')}
                        className="w-full truncate rounded bg-white/5 px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-white/15 hover:text-white"
                      >
                        {source.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selected.status === 'CANDIDATE' && (
              <button
                onClick={() => handleApprove(selected.id)}
                disabled={busy}
                className="w-full rounded-lg bg-white py-1.5 text-xs font-bold text-zinc-900 disabled:opacity-50"
              >
                승인 (관리자)
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 flex justify-between text-zinc-400">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
    </label>
  );
}
