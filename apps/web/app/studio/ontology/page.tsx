'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { computeRadialLayout } from '@archi/ontology';
import { apiFetch } from '@/lib/client/api';
import { NavRail } from '@/components/studio/NavRail';

type Me = { organizations: { workspaces: { id: string; name: string }[] }[] };

type GraphNode = {
  id: string;
  label: string;
  type: string;
  description: string | null;
  status: string;
  confidence: number | null;
};

type GraphEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  status: string;
};

const VIEW_W = 860;
const VIEW_H = 560;

const TYPE_COLORS: Record<string, string> = {
  space: '#0ea5e9',
  method: '#8b5cf6',
  material: '#10b981',
  defect: '#ef4444',
  regulation: '#f59e0b',
};

const TYPE_LABELS: Record<string, string> = {
  space: '공간',
  method: '공법',
  material: '자재',
  defect: '하자',
  regulation: '법규',
};

export default function OntologyPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'candidate'>('all');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Me>('/api/auth/me')
      .then((me) => setWorkspaceId(me.organizations[0]?.workspaces[0]?.id ?? null))
      .catch(() => setError('로그인이 필요합니다. 스튜디오에서 먼저 로그인해 주세요.'));
  }, []);

  const loadGraph = useCallback(
    (wsId: string, filter: string) => {
      apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
        `/api/ontology/graph?workspaceId=${wsId}&status=${filter}`,
      )
        .then((graph) => {
          setNodes(graph.nodes);
          setEdges(graph.edges);
          setSelected((prev) => graph.nodes.find((n) => n.id === prev?.id) ?? null);
        })
        .catch((e: Error) => setError(e.message));
    },
    [],
  );

  useEffect(() => {
    if (workspaceId) loadGraph(workspaceId, statusFilter);
  }, [workspaceId, statusFilter, loadGraph]);

  const positions = useMemo(
    () => computeRadialLayout(nodes, { width: VIEW_W, height: VIEW_H }),
    [nodes],
  );

  async function handleSeed() {
    if (!workspaceId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/ontology/seed', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
      loadGraph(workspaceId, statusFilter);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(nodeId: string) {
    if (busy || !workspaceId) return;
    setBusy(true);
    setError(null);
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

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />
      <main className="flex-1 overflow-y-auto bg-zinc-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">온톨로지 브레인맵</h1>
            <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-900">
              ← 스튜디오
            </Link>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="mb-4 flex items-center gap-2">
            {(['all', 'approved', 'candidate'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === filter
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {filter === 'all' ? '전체' : filter === 'approved' ? '승인됨' : '후보'}
              </button>
            ))}
            <span className="ml-auto flex gap-3 text-xs text-zinc-500">
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <span key={type} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: TYPE_COLORS[type] }}
                  />
                  {label}
                </span>
              ))}
            </span>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 rounded-xl border border-zinc-200 bg-white">
              {nodes.length === 0 ? (
                <div className="flex h-[560px] flex-col items-center justify-center gap-3 text-zinc-400">
                  <p className="text-sm">온톨로지 노드가 없습니다.</p>
                  <button
                    onClick={handleSeed}
                    disabled={busy}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    샘플 온톨로지 생성
                  </button>
                </div>
              ) : (
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full">
                  {edges.map((edge) => {
                    const from = positions.get(edge.sourceNodeId);
                    const to = positions.get(edge.targetNodeId);
                    if (!from || !to) return null;
                    const mx = (from.x + to.x) / 2;
                    const my = (from.y + to.y) / 2;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke={edge.status === 'APPROVED' ? '#a78bfa' : '#d4d4d8'}
                          strokeWidth={1.5}
                          strokeDasharray={edge.status === 'APPROVED' ? undefined : '4 3'}
                        />
                        <text
                          x={mx}
                          y={my - 4}
                          textAnchor="middle"
                          className="fill-zinc-400"
                          fontSize={10}
                        >
                          {edge.relationType}
                        </text>
                      </g>
                    );
                  })}
                  {nodes.map((node) => {
                    const pos = positions.get(node.id);
                    if (!pos) return null;
                    const color = TYPE_COLORS[node.type] ?? '#71717a';
                    const isSelected = selected?.id === node.id;
                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelected(node)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isSelected ? 26 : 22}
                          fill={color}
                          fillOpacity={node.status === 'APPROVED' ? 0.95 : 0.45}
                          stroke={isSelected ? '#18181b' : color}
                          strokeWidth={isSelected ? 2.5 : 1}
                          strokeDasharray={node.status === 'APPROVED' ? undefined : '4 3'}
                        />
                        <text
                          x={pos.x}
                          y={pos.y + 4}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          className="fill-white"
                        >
                          {node.label.slice(0, 5)}
                        </text>
                        <text
                          x={pos.x}
                          y={pos.y + 38}
                          textAnchor="middle"
                          fontSize={10}
                          className="fill-zinc-500"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <aside className="w-72 shrink-0 rounded-xl border border-zinc-200 bg-white p-4">
              {selected ? (
                <>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: TYPE_COLORS[selected.type] ?? '#71717a' }}
                    />
                    <h2 className="text-lg font-bold">{selected.label}</h2>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-400">유형</dt>
                      <dd>{TYPE_LABELS[selected.type] ?? selected.type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400">상태</dt>
                      <dd>
                        {selected.status === 'APPROVED' ? (
                          <span className="text-emerald-600">승인됨</span>
                        ) : (
                          <span className="text-amber-600">후보</span>
                        )}
                        {selected.confidence != null && (
                          <span className="ml-2 text-xs text-zinc-400">
                            신뢰도 {(selected.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </dd>
                    </div>
                    {selected.description && (
                      <div>
                        <dt className="text-xs text-zinc-400">설명</dt>
                        <dd className="leading-5 text-zinc-600">{selected.description}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-zinc-400">연결</dt>
                      <dd className="text-zinc-600">
                        {edges
                          .filter(
                            (e) =>
                              e.sourceNodeId === selected.id || e.targetNodeId === selected.id,
                          )
                          .map((e) => {
                            const otherId =
                              e.sourceNodeId === selected.id ? e.targetNodeId : e.sourceNodeId;
                            const other = nodes.find((n) => n.id === otherId);
                            return (
                              <span key={e.id} className="mr-1 inline-block text-xs">
                                {e.relationType}→{other?.label ?? '?'}
                              </span>
                            );
                          })}
                      </dd>
                    </div>
                  </dl>
                  {selected.status === 'CANDIDATE' && (
                    <button
                      onClick={() => handleApprove(selected.id)}
                      disabled={busy}
                      className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      승인 (관리자)
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-400">노드를 클릭하면 상세 정보가 표시됩니다.</p>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
