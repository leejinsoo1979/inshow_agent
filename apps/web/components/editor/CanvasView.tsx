'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockTypes } from '@archi/editor';
import { apiFetch } from '@/lib/client/api';
import { BlockContentEditor } from './BlockContentEditor';
import type { CanvasLayout, DocumentWithBlocks, EditorBlock } from './BlockEditor';

/** 아트보드(페이지) 크기 — A4 비율에 가까운 고정 페이지. PDF '화면 그대로' 렌더의 기준이 된다. */
const PAGE_W = 820;
const PAGE_H = 1160;
const GRID = 4;
const MIN_W = 80;
const MIN_H = 36;
const SNAP = 6; // 정렬 스냅/가이드가 작동하는 거리(px)
const snap = (v: number) => Math.round(v / GRID) * GRID;

/** 이동/리사이즈 중인 변(positions)을 정렬 후보(targets)에 맞춰 스냅. 가장 가까운 한 곳만 반환. */
function snapAxis(
  positions: number[],
  targets: number[],
): { delta: number; guide: number } | null {
  let best: { dist: number; delta: number; guide: number } | null = null;
  for (const p of positions) {
    for (const t of targets) {
      const dist = Math.abs(p - t);
      if (dist <= SNAP && (!best || dist < best.dist)) {
        best = { dist, delta: t - p, guide: t };
      }
    }
  }
  return best ? { delta: best.delta, guide: best.guide } : null;
}

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

/** 8방향 리사이즈 핸들 정의: 어느 변이 움직이는지 + 위치/커서 */
type Dir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: { dir: Dir; left: string; top: string; cursor: string }[] = [
  { dir: 'nw', left: '0%', top: '0%', cursor: 'cursor-nwse-resize' },
  { dir: 'n', left: '50%', top: '0%', cursor: 'cursor-ns-resize' },
  { dir: 'ne', left: '100%', top: '0%', cursor: 'cursor-nesw-resize' },
  { dir: 'e', left: '100%', top: '50%', cursor: 'cursor-ew-resize' },
  { dir: 'se', left: '100%', top: '100%', cursor: 'cursor-nwse-resize' },
  { dir: 's', left: '50%', top: '100%', cursor: 'cursor-ns-resize' },
  { dir: 'sw', left: '0%', top: '100%', cursor: 'cursor-nesw-resize' },
  { dir: 'w', left: '0%', top: '50%', cursor: 'cursor-ew-resize' },
];

const MOVES_LEFT: Dir[] = ['nw', 'w', 'sw'];
const MOVES_RIGHT: Dir[] = ['ne', 'e', 'se'];
const MOVES_TOP: Dir[] = ['nw', 'n', 'ne'];
const MOVES_BOTTOM: Dir[] = ['sw', 's', 'se'];

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
 * 자유 배치(캔버스) 모드 — 피그마/PPT처럼 블록을 클릭해 선택하고, 몸체를 드래그해 이동,
 * 8방향 핸들로 크기를 조절한다. 더블클릭하면 글자 편집 모드로 들어간다.
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const contentTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dragRef = useRef<{
    id: string;
    kind: 'move' | 'resize';
    dir?: Dir;
    startX: number;
    startY: number;
    base: CanvasLayout;
    moved: boolean;
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

  // Esc로 편집 모드 종료
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditingId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;

    // 정렬 후보: 다른 블록들의 좌/중심/우(상/중심/하) + 페이지 가장자리·중심
    const others = Object.entries(layoutsRef.current)
      .filter(([id]) => id !== d.id)
      .map(([, l]) => l);
    const targetsX = [0, PAGE_W / 2, PAGE_W];
    const targetsY = [0, PAGE_H / 2, PAGE_H];
    for (const o of others) {
      targetsX.push(o.x, o.x + o.w / 2, o.x + o.w);
      targetsY.push(o.y, o.y + o.h / 2, o.y + o.h);
    }

    setLayouts((prev) => {
      const next = { ...prev };
      const b = d.base;
      const nextGuides: { x: number[]; y: number[] } = { x: [], y: [] };

      if (d.kind === 'move') {
        let x = Math.max(0, snap(b.x + dx));
        let y = Math.max(0, snap(b.y + dy));
        const sx = snapAxis([x, x + b.w / 2, x + b.w], targetsX);
        if (sx) {
          x += sx.delta;
          nextGuides.x.push(sx.guide);
        }
        const sy = snapAxis([y, y + b.h / 2, y + b.h], targetsY);
        if (sy) {
          y += sy.delta;
          nextGuides.y.push(sy.guide);
        }
        next[d.id] = { ...b, x, y };
        setGuides(nextGuides);
        return next;
      }

      // resize — 방향에 따라 움직이는 변만 갱신 (움직이는 변을 정렬 후보에 스냅)
      const dir = d.dir!;
      let { x, y, w, h } = b;
      if (MOVES_LEFT.includes(dir)) {
        let left = snap(b.x + dx);
        const sx = snapAxis([left], targetsX);
        if (sx) {
          left += sx.delta;
          nextGuides.x.push(sx.guide);
        }
        x = Math.max(0, Math.min(left, b.x + b.w - MIN_W));
        w = b.x + b.w - x;
      }
      if (MOVES_RIGHT.includes(dir)) {
        let right = snap(b.x + b.w + dx);
        const sx = snapAxis([right], targetsX);
        if (sx) {
          right += sx.delta;
          nextGuides.x.push(sx.guide);
        }
        w = Math.max(MIN_W, right - b.x);
      }
      if (MOVES_TOP.includes(dir)) {
        let top = snap(b.y + dy);
        const sy = snapAxis([top], targetsY);
        if (sy) {
          top += sy.delta;
          nextGuides.y.push(sy.guide);
        }
        y = Math.max(0, Math.min(top, b.y + b.h - MIN_H));
        h = b.y + b.h - y;
      }
      if (MOVES_BOTTOM.includes(dir)) {
        let bottom = snap(b.y + b.h + dy);
        const sy = snapAxis([bottom], targetsY);
        if (sy) {
          bottom += sy.delta;
          nextGuides.y.push(sy.guide);
        }
        h = Math.max(MIN_H, bottom - b.y);
      }
      next[d.id] = { x, y, w, h };
      setGuides(nextGuides);
      return next;
    });
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    setGuides({ x: [], y: [] });
    if (d && d.moved) void persistCanvas(d.id);
  }, [onPointerMove, persistCanvas]);

  const beginDrag = useCallback(
    (e: React.PointerEvent, id: string, kind: 'move' | 'resize', dir?: Dir) => {
      e.preventDefault();
      e.stopPropagation();
      if (editingId && editingId !== id) setEditingId(null);
      onSelectBlock(id);
      const base = layoutsRef.current[id];
      if (!base) return;
      dragRef.current = { id, kind, dir, startX: e.clientX, startY: e.clientY, base, moved: false };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp, { once: true });
    },
    [editingId, onSelectBlock, onPointerMove, onPointerUp],
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
          onPointerDown={() => {
            onSelectBlock(null);
            setEditingId(null);
          }}
        >
          {/* 정렬 가이드 (드래그 중, X/Y축이 맞을 때) */}
          {guides.x.map((gx, i) => (
            <div
              key={`gx-${i}`}
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-rose-500"
              style={{ left: gx }}
            />
          ))}
          {guides.y.map((gy, i) => (
            <div
              key={`gy-${i}`}
              className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-rose-500"
              style={{ top: gy }}
            />
          ))}

          {blocks.map((block) => {
            const l = layouts[block.id];
            if (!l) return null;
            const selected = selectedBlockId === block.id;
            const editing = editingId === block.id;
            return (
              <div
                key={block.id}
                className={`absolute select-none rounded-md ${
                  selected
                    ? 'outline outline-2 outline-zinc-900'
                    : 'outline outline-1 outline-transparent hover:outline-zinc-300'
                }`}
                style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!editing) {
                    // 편집 중이 아니면 몸체 어디서든 잡아서 이동 (피그마/PPT 방식)
                    beginDrag(e, block.id, 'move');
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock(block.id);
                  setEditingId(block.id);
                }}
              >
                {/* 본문 — 편집 모드에서만 입력 가능, 아니면 포인터 이벤트를 막아 이동 우선 */}
                <div
                  className={`h-full w-full overflow-auto rounded-md bg-white p-3 ${
                    editing ? '' : 'pointer-events-none'
                  } ${selected ? '' : 'cursor-default'}`}
                  style={editing ? undefined : { cursor: 'move' }}
                >
                  <BlockContentEditor
                    type={block.type}
                    content={block.content}
                    onChange={(content) => handleContentChange(block.id, content)}
                  />
                </div>

                {/* 타입 라벨 (선택 시, 좌상단 바깥) */}
                {selected && (
                  <span className="pointer-events-none absolute -top-5 left-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {TYPE_LABELS[block.type] ?? block.type}
                    {!editing && <span className="ml-1 opacity-60">더블클릭=편집</span>}
                  </span>
                )}

                {/* 8방향 리사이즈 핸들 (선택 & 비편집 시) */}
                {selected &&
                  !editing &&
                  HANDLES.map((hd) => (
                    <div
                      key={hd.dir}
                      onPointerDown={(e) => beginDrag(e, block.id, 'resize', hd.dir)}
                      className={`absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-zinc-900 bg-white ${hd.cursor}`}
                      style={{ left: hd.left, top: hd.top }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
