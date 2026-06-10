'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockTypes } from '@archi/editor';
import { apiFetch } from '@/lib/client/api';
import { BlockContentEditor } from './BlockContentEditor';
import type { CanvasLayout, DocumentWithBlocks, EditorBlock } from './BlockEditor';

/** 아트보드(페이지) 크기 — A4 비율에 가까운 고정 페이지. PDF '화면 그대로' 렌더의 기준이 된다. */
const PAGE_W = 820;
const PAGE_H = 1160;
const GRID = 8;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const TYPE_LABELS: Record<string, string> = {
  heading: '제목',
  paragraph: '문단',
  image: '이미지',
  checklist: '체크리스트',
  source_reference: '출처',
  cta: 'CTA',
  chart: '차트',
  table: '표',
  formula: '계산식',
  doc_meta: '문서정보',
  qna: 'Q&A',
};

/** 캔버스 좌표가 아직 없는 블록을 세로로 쌓는 기본 높이(타입별) */
const DEFAULT_H: Record<string, number> = {
  heading: 64,
  paragraph: 140,
  image: 260,
  checklist: 168,
  source_reference: 140,
  cta: 120,
  chart: 300,
  table: 200,
  formula: 184,
  doc_meta: 120,
  qna: 240,
};

/** 좌표가 없는 블록에 결정적(deterministic) 기본 배치를 부여 — 새로고침해도 위치가 튀지 않는다. */
function resolveLayouts(blocks: EditorBlock[]): Record<string, CanvasLayout> {
  const out: Record<string, CanvasLayout> = {};
  let cursor = 40;
  for (const b of blocks) {
    const saved = b.metadata?.canvas;
    if (saved) {
      out[b.id] = saved;
      continue;
    }
    const h = DEFAULT_H[b.type] ?? 140;
    out[b.id] = { x: 40, y: cursor, w: PAGE_W - 80, h };
    cursor += h + 16;
  }
  return out;
}

type Props = {
  documentId: string;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  reloadKey?: number;
  onBlocksLoaded?: (blocks: EditorBlock[]) => void;
  onDocumentLoaded?: (doc: { id: string; projectId: string; title: string; status: string }) => void;
  onSaveStateChange?: (state: 'idle' | 'saving' | 'saved') => void;
  /** 우측 패널 '+ 블록 추가' 트리거 */
  openAddMenuKey?: number;
};

/**
 * 자유 배치(캔버스) 모드 — 피그마/PPT처럼 블록을 드래그로 이동하고 모서리로 크기를 조절한다.
 * 위치/크기는 block.metadata.canvas 에 저장된다(DB 마이그레이션 없이 metadata 재사용).
 */
export function CanvasView({
  documentId,
  selectedBlockId,
  onSelectBlock,
  reloadKey,
  onBlocksLoaded,
  onDocumentLoaded,
  onSaveStateChange,
  openAddMenuKey,
}: Props) {
  const [doc, setDoc] = useState<DocumentWithBlocks | null>(null);
  const [layouts, setLayouts] = useState<Record<string, CanvasLayout>>({});
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const contentTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dragRef = useRef<{
    id: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    base: CanvasLayout;
  } | null>(null);

  const load = useCallback(() => {
    apiFetch<DocumentWithBlocks>(`/api/documents/${documentId}`)
      .then((data) => {
        setDoc(data);
        setLayouts(resolveLayouts(data.blocks));
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (doc) {
      onBlocksLoaded?.(doc.blocks);
      onDocumentLoaded?.({
        id: doc.id,
        projectId: doc.projectId,
        title: doc.title,
        status: doc.status,
      });
    }
  }, [doc, onBlocksLoaded, onDocumentLoaded]);

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

  // 우측 패널 '+ 블록 추가' → 문단 블록을 만들고 캔버스에 배치
  const addBlockKey = useRef(openAddMenuKey);
  useEffect(() => {
    if (openAddMenuKey === undefined || openAddMenuKey === addBlockKey.current) return;
    addBlockKey.current = openAddMenuKey;
    (async () => {
      try {
        await apiFetch(`/api/documents/${documentId}/blocks`, {
          method: 'POST',
          body: JSON.stringify({ block: { type: BlockTypes.PARAGRAPH, content: { text: '' } } }),
        });
        load();
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [openAddMenuKey, documentId, load]);

  const persistCanvas = useCallback(async (id: string) => {
    const c = layoutsRef.current[id];
    if (!c) return;
    setSaveState('saving');
    try {
      await apiFetch(`/api/blocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ canvas: c }),
      });
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setLayouts((prev) => {
      const next = { ...prev };
      if (d.mode === 'move') {
        next[d.id] = {
          ...d.base,
          x: Math.max(0, snap(d.base.x + dx)),
          y: Math.max(0, snap(d.base.y + dy)),
        };
      } else {
        next[d.id] = {
          ...d.base,
          w: Math.max(80, snap(d.base.w + dx)),
          h: Math.max(40, snap(d.base.h + dy)),
        };
      }
      return next;
    });
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    if (d) void persistCanvas(d.id);
  }, [onPointerMove, persistCanvas]);

  const startDrag = useCallback(
    (e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
      e.preventDefault();
      e.stopPropagation();
      onSelectBlock(id);
      const base = layoutsRef.current[id];
      if (!base) return;
      dragRef.current = { id, mode, startX: e.clientX, startY: e.clientY, base };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp, { once: true });
    },
    [onSelectBlock, onPointerMove, onPointerUp],
  );

  function handleContentChange(id: string, content: Record<string, unknown>) {
    setDoc((prev) =>
      prev ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? { ...b, content } : b)) } : prev,
    );
    const timers = contentTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    setSaveState('saving');
    timers.set(
      id,
      setTimeout(async () => {
        try {
          await apiFetch(`/api/blocks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ content }),
          });
          setSaveState('saved');
        } catch {
          setSaveState('idle');
        }
      }, 600),
    );
  }

  const blocks = useMemo(() => doc?.blocks ?? [], [doc]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-zinc-200/70 p-8">
      {blocks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          블록이 없습니다. 우측 패널에서 ‘+ 블록 추가’로 시작하세요.
        </div>
      ) : (
        <div
          className="relative mx-auto bg-white shadow-md ring-1 ring-zinc-300"
          style={{ width: PAGE_W, minHeight: PAGE_H }}
          onPointerDown={() => onSelectBlock(null)}
        >
          {blocks.map((block) => {
            const l = layouts[block.id];
            if (!l) return null;
            const selected = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                className={`group absolute flex flex-col rounded-lg border bg-white transition-shadow ${
                  selected
                    ? 'border-zinc-900 shadow-lg'
                    : 'border-transparent hover:border-zinc-300 hover:shadow-sm'
                }`}
                style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectBlock(block.id);
                }}
              >
                {/* 드래그 그립 (이동) */}
                <div
                  onPointerDown={(e) => startDrag(e, block.id, 'move')}
                  className={`flex h-6 shrink-0 cursor-move items-center justify-between rounded-t-lg px-2 text-[10px] font-semibold ${
                    selected ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  <span>⠿ {TYPE_LABELS[block.type] ?? block.type}</span>
                  <span className="tabular-nums opacity-60">
                    {Math.round(l.w)}×{Math.round(l.h)}
                  </span>
                </div>

                {/* 본문 (그대로 편집 가능) */}
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  <BlockContentEditor
                    type={block.type}
                    content={block.content}
                    onChange={(content) => handleContentChange(block.id, content)}
                  />
                </div>

                {/* 리사이즈 핸들 (우하단) */}
                <div
                  onPointerDown={(e) => startDrag(e, block.id, 'resize')}
                  title="크기 조절"
                  className="absolute -bottom-1 -right-1 h-4 w-4 cursor-nwse-resize"
                >
                  <div
                    className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-sm border ${
                      selected
                        ? 'border-zinc-900 bg-white'
                        : 'border-zinc-400 bg-white opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
